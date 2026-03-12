// 模块化内容渲染引擎 (终极对齐与配置适配版)
class ModularContentRenderer {
    constructor() {
        this.config = null;
        this.modules = new Map();
        this.isLoading = false;
        this.errorMessages = [];
        this.currentModule = null; 
    }

    // --- UI 状态管理 ---
    showLoading() {
        const main = document.querySelector('main');
        if (main) main.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>正在加载内容...</p></div>`;
    }

    showError(message) {
        console.error(message);
        const main = document.querySelector('main');
        if (main) main.innerHTML = `<div class="error-container"><h2>加载错误</h2><p>${message}</p></div>`;
    }

    // --- 数据加载层 ---
    async loadConfig() {
        const response = await fetch('data/config.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}: 加载主配置失败`);
        this.config = await response.json();
    }

    async loadModules() {
        const fetchPromises = Object.entries(this.config.modules)
            .filter(([_, config]) => config.enabled)
            .map(async ([moduleId, moduleConfig]) => {
                try {
                    const response = await fetch(`data/modules/${moduleConfig.file}`);
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const moduleData = await response.json();
                    this.modules.set(moduleId, { ...moduleConfig, ...moduleData });
                } catch (error) {
                    console.error(`模块 ${moduleId} 加载失败:`, error);
                }
            });
        await Promise.all(fetchPromises);
    }

    // --- 初始化入口 ---
    async init() {
        try {
            this.isLoading = true;
            this.showLoading();
            
            await this.loadConfig();
            this.renderHeader(this.config.header);
            this.renderProfile(this.config.profile);
            
            await this.loadModules();
            
            const enabledModules = Array.from(this.modules.entries())
                .sort(([, a], [, b]) => a.order - b.order);
            
            if (enabledModules.length > 0) {
                this.currentModule = enabledModules[0][0]; 
            }
            
            this.renderNavigation();
            this.renderFooter(this.config.footer);
            
            this.renderCurrentModule();
        } catch (error) {
            this.showError('初始化失败，请检查网络或配置文件。');
        } finally {
            this.isLoading = false;
        }
    }

    // --- 路由与切换 ---
    switchModule(moduleId) {
        if (!this.modules.has(moduleId)) return;
        if (this.currentModule === moduleId) {
            const existingSection = document.querySelector(`#${moduleId}`);
            if (existingSection && existingSection.innerHTML.trim() !== '') return;
        }
        
        this.currentModule = moduleId;
        this.updateNavigationHighlight();
        this.renderCurrentModule(); 
    }

    renderCurrentModule() {
        const main = document.querySelector('main');
        if (!main) return;
        
        const moduleData = this.modules.get(this.currentModule);
        if (!moduleData) return;

        let html = '';
        if (moduleData.renderer === 'papers') {
            html = this.buildPapersHtml(this.currentModule, moduleData);
        } else if (['employment', 'education', 'experience'].includes(this.currentModule)) {
            html = this.buildTimelineHtml(this.currentModule, moduleData);
        } else {
            html = this.buildStandardHtml(this.currentModule, moduleData);
        }
        
        main.innerHTML = html;
    }

    updateNavigationHighlight() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('data-module') === this.currentModule);
        });
    }

    // --- HTML 构建器 ---
    buildStandardHtml(moduleId, moduleData) {
        let html = `<section id="${moduleId}" class="module-section visible fade-in">`;
        if (moduleData.content) {
            moduleData.content.forEach(item => { html += this.renderContentItem(item); });
        }
        if (moduleData.footerLink) {
            html += `<p><a href="${moduleData.footerLink.url}">${moduleData.footerLink.text}</a></p>`;
        }
        html += '</section>';
        return html;
    }

    buildTimelineHtml(moduleId, moduleData) {
        let html = `<section id="${moduleId}" class="module-section visible fade-in">`;
        html += `<div class="timeline-container">`;

        if (moduleData.content) {
            moduleData.content.forEach(item => {
                if (item.type === 'list' || item.type === 'orderedList') {
                    if (item.layout === 'tags') {
                        html += this.renderTags(item);
                    } else if (item.layout === 'cards') {
                        html += this.renderCards(item);
                    } else {
                        item.items.forEach(listItem => {
                            let rawText = typeof listItem === 'string' ? listItem : (listItem.text || '');
                            const dateRegex = /^([0-9]{4}(?:\.[0-9]{1,2})?\s*(?:-|~|—)\s*(?:[0-9]{4}(?:\.[0-9]{1,2})?|至今|Present|Now)?)([,，:：\s]*)/;
                            let dateStr = "";
                            let contentHtml = this.renderComplexItemContent(listItem);
                            const match = rawText.match(dateRegex);
                            if (match) {
                                dateStr = match[1];
                                contentHtml = contentHtml.replace(match[0], ''); 
                            }
                            html += `
                                <div class="timeline-item">
                                    <div class="timeline-date">${dateStr}</div>
                                    <div class="timeline-content">
                                        <div class="timeline-text">${contentHtml}</div>
                                        ${listItem.sublist ? `<ul class="timeline-sublist">${listItem.sublist.map(sub => `<li>${sub}</li>`).join('')}</ul>` : ''}
                                    </div>
                                </div>
                            `;
                        });
                    }
                } else {
                    html += this.renderContentItem(item);
                }
            });
        }
        
        if (moduleData.footerLink) html += `<p><a href="${moduleData.footerLink.url}">${moduleData.footerLink.text}</a></p>`;
        html += `</div></section>`;
        return html;
    }

    buildPapersHtml(moduleId, moduleData) {
        let html = `<section id="${moduleId}" class="module-section visible fade-in">`;
        html += '<div class="papers-container">';
        if (moduleData.papers && Array.isArray(moduleData.papers)) {
            moduleData.papers.forEach((paper, index) => {
                html += this.renderPaperItem(paper, index + 1);
            });
        }
        html += '</div></section>';
        return html;
    }

    // --- 基础组件渲染逻辑 ---
    renderHeader(headerConfig) {
        document.title = headerConfig.title;
        ['description', 'keywords', 'author'].forEach(name => {
            if (headerConfig.meta[name]) {
                const meta = document.querySelector(`meta[name="${name}"]`);
                if (meta) meta.content = headerConfig.meta[name];
            }
        });
    }

    renderProfile(profile) {
        const header = document.querySelector('header');
        if (!header) return;
        
        // 解析新增加的 bio (简介) 和 email (头部联系方式)
        const bioHtml = profile.bio ? `<p class="profile-bio" style="color: var(--text-muted); line-height: 1.6; margin-top: 12px; margin-bottom: 12px; max-width: 700px; font-style: italic;">${profile.bio}</p>` : '';
        
        let contactHtml = '';
        if (profile.email && Array.isArray(profile.email)) {
            const emails = profile.email.map(e => `<a href="mailto:${e.display}${e.domain}" style="display: inline-flex; align-items: center; margin-right: 16px; color: var(--primary-color); font-weight: 500; font-size: 0.95rem; text-decoration: none;"><svg style="width: 16px; height: 16px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>${e.display}${e.domain}</a>`).join('');
            contactHtml = `<div class="profile-contacts" style="margin-top: 12px; display: flex; flex-wrap: wrap;">${emails}</div>`;
        }

        header.innerHTML = `
            <div class="header-content" style="align-items: center;">
                <img src="${profile.photo}" alt="${profile.name}" class="profile-img">
                <div class="header-info">
                    <h1 style="margin-bottom: 6px;">${profile.name}</h1>
                    <div class="affiliation">
                        ${profile.affiliations.map(aff => `<p style="margin: 0; display: inline-block; margin-right: 12px;"><a href="${aff.url}" target="_blank">${aff.name}</a></p>`).join('')}
                    </div>
                    ${bioHtml}
                    ${contactHtml}
                </div>
            </div>
        `;
    }

    renderNavigation() {
        let nav = document.querySelector('nav ul');
        if (!nav) {
            const header = document.querySelector('header');
            if (!header) return;
            const newNav = document.createElement('nav');
            newNav.innerHTML = '<ul></ul>';
            header.appendChild(newNav);
            nav = document.querySelector('nav ul');
        }
        
        let navHTML = '<li class="nav-brand">龚成明@DERI</li><div class="nav-menu">';
        this.modules.forEach((moduleData, moduleId) => {
            const activeClass = moduleId === this.currentModule ? 'active' : '';
            navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
        });
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
        }
        navHTML += '</div>';
        
        nav.innerHTML = navHTML;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchModule(link.getAttribute('data-module'));
            });
        });
    }

    // 🔥 彻底修复的页脚渲染器：强制清除内外边距，确保完美顶端对齐
    renderFooter(footer) {
        const footerElement = document.querySelector('footer');
        if (!footerElement) return;
        
        // 兼容 config.json 中固定的更新日期或动态日期
        const now = new Date();
        const updateDate = footer.updateDate || `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;

        let contactsHTML = '';
        if (footer.contacts) {
            const c = footer.contacts;
            const addrLink = c.address?.coordinates ? `<a href="${c.address.coordinates.url}" target="_blank">${c.address.coordinates.text}</a>` : '';
            
            contactsHTML = `<div class="footer-contacts">` +
                (c.address ? `<div class="contact-item">${c.address.text}${addrLink}${c.address.suffix || ''}</div>` : '') +
                `</div>`;
        }

        footerElement.innerHTML = `
            <div class="footer-content">
                ${contactsHTML}
                <div class="footer-info">
                    <p>${footer.createDate}，${updateDate}<a href="${footer.updateLink}">更新</a></p>
                </div>
            </div>
        `;
    }

    renderContentItem(item) {
        switch (item.type) {
            case 'paragraph': 
                return `<h3 class="section-subtitle">${item.text}</h3>`;
            case 'list':
            case 'orderedList':
                if (item.layout === 'tags') return this.renderTags(item);
                if (item.layout === 'cards') return this.renderCards(item);
                return item.type === 'list' ? this.renderList(item) : this.renderOrderedList(item);
            default: 
                return '';
        }
    }

    renderList(listData) {
        let html = `<ul type="${listData.listType || 'disc'}">`;
        listData.items.forEach(item => {
            html += typeof item === 'object' ? this.renderComplexListItem(item) : `<li>${item}</li>`;
        });
        return html + '</ul>';
    }

    renderOrderedList(listData) {
        let html = `<ul class="custom-list">`;
        listData.items.forEach(item => {
            html += `<li>${this.renderComplexItemContent(item)}</li>`;
        });
        return html + '</ul>';
    }

    renderComplexListItem(item) {
        if (typeof item === 'string') return `<li>${item}</li>`;
        let html = `<li>${this.renderComplexItemContent(item)}`;
        if (item.sublist) {
            html += '<ul>' + item.sublist.map(sub => `<li>${sub}</li>`).join('') + '</ul>';
        }
        return html + '</li>';
    }

    renderComplexItemContent(item) {
        if (typeof item === 'string') return item;
        let content = item.text || '';
        
        const replaceLinks = (links) => {
            if (!links) return;
            links.forEach(link => {
                const target = link.target ? ` target="${link.target}"` : '';
                content = content.replace(new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), `<a href="${link.url}"${target}>${link.text}</a>`);
            });
        };

        replaceLinks(item.links);
        content += item.suffix || '';
        replaceLinks(item.links2);
        content += item.suffix2 || '';

        if (item.class === 'tip' && item.abstract) {
            content = `<a class="tip" href="${item.url || '#'}"><span><strong>ABSTRACT</strong>: ${item.abstract}</span>${content}</a>`;
        } else if (item.links && !item.class) {
            item.links.forEach(link => { content += ` <a href="${link.url}">${link.text}</a>`; });
        }
        return content;
    }

    renderPaperItem(paper, index) {
        const authorsHTML = paper.authors.map(a => `<span class="author">${a.nameEn} (${a.name})</span>`).join(', ');
        const kwHTML = paper.keywords ? paper.keywords.join('; ') : '';
        const kwEnHTML = paper.keywordsEn ? paper.keywordsEn.join('; ') : '';
        const doiLink = paper.doi ? `DOI: <a href="https://doi.org/${paper.doi}" target="_blank">${paper.doi}</a>` : '';
        
        let journalInfo = '';
        if (paper.type === 'journal') {
            journalInfo = `<em>${paper.journalEn}</em> (${paper.journal}), ${paper.year}, <strong>${paper.volume}</strong>(${paper.issue}): ${paper.pages}. ${doiLink}`;
        } else if (paper.type === 'conference') {
            journalInfo = `<em>${paper.conference}</em>, ${paper.location}, ${paper.year}, pp. ${paper.pages}. ${doiLink}`;
        } else if (paper.type === 'preprint') {
            const arxivLink = paper.doi ? `arXiv: <a href="https://arxiv.org/abs/${paper.doi.replace('arXiv:', '')}" target="_blank">${paper.doi}</a>` : '';
            journalInfo = `<em>${paper.journalEn}</em>, ${paper.year}, ${paper.pages}. ${arxivLink}`;
        }

        return `
            <div class="paper-item ${paper.type}-paper">
                <div class="paper-header">
                    <span class="paper-index">${index}.</span>
                    <div class="paper-title">${paper.titleEn}<br><span class="paper-title-zh">${paper.title}</span></div>
                </div>
                <div class="paper-authors">${authorsHTML}</div>
                <div class="paper-journal">${journalInfo}</div>
                ${kwHTML ? `<div class="paper-keywords"><strong>关键词:</strong> ${kwHTML}</div>` : ''}
                ${kwEnHTML ? `<div class="paper-keywords-en"><strong>Keywords:</strong> ${kwEnHTML}</div>` : ''}
                <div class="paper-abstract"><strong>摘要:</strong> ${paper.abstract}</div>
                ${paper.abstractEn ? `<div class="paper-abstract-en"><strong>Abstract:</strong> ${paper.abstractEn}</div>` : ''}
            </div>
        `;
    }

    renderTags(listData) {
        let html = `<div class="tags-container">`;
        listData.items.forEach(item => {
            const text = typeof item === 'string' ? item : this.renderComplexItemContent(item);
            html += `<span class="tag-item">${text}</span>`;
        });
        html += `</div>`;
        return html;
    }

    renderCards(listData) {
        let html = `<div class="cards-container">`;
        listData.items.forEach(item => {
            let rawText = typeof item === 'string' ? item : (item.text || '');
            let contentHtml = typeof item === 'string' ? item : this.renderComplexItemContent(item);
            
            let badgeHtml = '';
            let badgeClass = '';
            
            const yearMatch = rawText.match(/^([0-9]{4})(?:\s+|-|年)/);
            const patentMatch = rawText.match(/^(发明专利|实用新型|外观设计)[\.。,，\s]*/);
            
            if (yearMatch) {
                badgeHtml = yearMatch[1];
                badgeClass = 'badge-year';
                contentHtml = contentHtml.replace(yearMatch[0], '');
            } else if (patentMatch) {
                badgeHtml = patentMatch[1];
                badgeClass = 'badge-patent';
                contentHtml = contentHtml.replace(patentMatch[0], '');
                const numMatch = contentHtml.match(/^([a-zA-Z0-9\.]+)(?:\.\s*|\s+)/);
                if(numMatch) {
                   contentHtml = contentHtml.replace(numMatch[0], `<span class="patent-number">${numMatch[1]}</span> `);
                }
                contentHtml = contentHtml.replace(/(发明人|设计人)[:：]\s*([^，。]+)/g, '<br><strong>$1:</strong>$2');
            }

            html += `
                <div class="card-item">
                    ${badgeHtml ? `<div class="card-badge ${badgeClass}">${badgeHtml}</div>` : ''}
                    <div class="card-body">${contentHtml}</div>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    }
}

// 唯一启动入口
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ModularContentRenderer();
    renderer.init(); 
});
