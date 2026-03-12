// 模块化内容渲染引擎 (完全数据驱动版)
class ModularContentRenderer {
    constructor() {
        this.config = null;
        this.modules = new Map();
        this.isLoading = false;
        this.errorMessages = [];
        this.currentModule = null; 
    }

    showLoading() {
        const main = document.querySelector('main');
        if (main) main.innerHTML = `<div class="loading-container"><div class="loading-spinner"></div><p>正在加载内容...</p></div>`;
    }

    showError(message) {
        console.error(message);
        const main = document.querySelector('main');
        if (main) main.innerHTML = `<div class="error-container"><h2>加载错误</h2><p>${message}</p></div>`;
    }

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
        
        // 简介部分：强制左对齐，增加呼吸感
        const bioHtml = profile.bio ? 
            `<p style="color: var(--text-muted); line-height: 1.6; margin: 16px 0; font-style: italic; text-align: left; font-size: 0.95rem;">${profile.bio}</p>` : '';
        
        let contactHtml = '';
        if (profile.email && Array.isArray(profile.email)) {
            const emails = profile.email.map(e => 
                `<a href="mailto:${e.display}${e.domain}" style="display: inline-flex; align-items: center; margin-right: 16px; color: var(--primary-color); font-weight: 500; font-size: 0.9rem; text-decoration: none; white-space: nowrap;">
                    <svg style="width: 14px; height: 14px; margin-right: 4px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                    ${e.display}${e.domain}
                </a>`).join('');
            contactHtml = `<div style="display: flex; flex-wrap: wrap; justify-content: flex-start; gap: 8px;">${emails}</div>`;
        }

        header.innerHTML = `
            <div class="header-content" style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                <div style="display: flex; align-items: center; width: 100%; gap: 16px; margin-bottom: 8px;">
                    <img src="${profile.photo}" alt="${profile.name}" class="profile-img">
                    <div style="flex-grow: 1;">
                        <h1 style="margin: 0; font-size: 1.8rem; color: var(--text-main);">${profile.name}</h1>
                        <div class="affiliation" style="margin-top: 4px;">
                            ${profile.affiliations.map(aff => `
                                <p style="margin: 0; font-size: 0.9rem; color: var(--text-muted); position: relative; display: inline-block;">
                                    <a href="${aff.url}" target="_blank" 
                                       style="text-decoration: none; color: inherit; cursor: pointer;"
                                       onmouseover="this.parentElement.querySelector('.tooltip').style.display='block';"
                                       onmouseout="this.parentElement.querySelector('.tooltip').style.display='none';">
                                        <span class="affiliation-full">${aff.name}</span>
                                        <span class="affiliation-abbr" style="display: none;">${aff.abbr || aff.name}</span>
                                    </a>
                                    ${aff.tip ? `
                                    <span class="tooltip" 
                                          style="display: none; position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); 
                                                 background: var(--text-main); color: white; padding: 4px 8px; border-radius: 4px; 
                                                 font-size: 0.8rem; white-space: nowrap; z-index: 1000; margin-bottom: 4px;
                                                 box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
                                        ${aff.tip}
                                        <span style="position: absolute; top: 100%; left: 50%; transform: translateX(-50); 
                                                   border: 4px solid transparent; border-top-color: var(--text-main);"></span>
                                    </span>
                                    ` : ''}
                                </p>
                            `).join('')}
                        </div>
                    </div>
                </div>
                ${bioHtml}
                ${contactHtml}
            </div>
        `;

        // 响应式单位名称显示
        this.updateAffiliationDisplay();
        window.addEventListener('resize', () => this.updateAffiliationDisplay());
    }

    updateAffiliationDisplay() {
        const isMobile = window.innerWidth <= 768;
        const fullNames = document.querySelectorAll('.affiliation-full');
        const abbrNames = document.querySelectorAll('.affiliation-abbr');
        
        fullNames.forEach(el => {
            el.style.display = isMobile ? 'none' : 'inline';
        });
        
        abbrNames.forEach(el => {
            el.style.display = isMobile ? 'inline' : 'none';
        });
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
        
        const brandText = this.config.navBrand || this.config.profile.name;
        
        // 导航栏采用 Flex 布局，品牌名和菜单左右对齐
        let navHTML = `<li class="nav-brand" style="font-weight: 700; font-size: 1.1rem; white-space: nowrap;">${brandText}</li>`;
        navHTML += `<div style="display: flex; align-items: center; gap: 8px; margin-left: auto;">`;
        
        // 按order排序模块
        const sortedModules = Array.from(this.modules.entries())
            .sort(([, a], [, b]) => a.order - b.order);
        sortedModules.forEach(([moduleId, moduleData]) => {
            const activeClass = moduleId === this.currentModule ? 'active' : '';
            navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}" style="font-size: 0.9rem; padding: 4px 6px;">${moduleData.title}</a></li>`;
        });
        
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" style="font-size: 0.8rem; padding: 2px 8px; border: 1px solid var(--border-color); border-radius: 12px; color: var(--text-muted); text-decoration: none; margin-left: 4px;">EN</a></li>`;
        }
        navHTML += `</div>`;
        
        nav.style.display = 'flex';
        nav.style.alignItems = 'center';
        nav.style.width = '100%';
        nav.innerHTML = navHTML;
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchModule(link.getAttribute('data-module'));
            });
        });
    }

renderFooter(footer) {
        const footerElement = document.querySelector('footer');
        if (!footerElement) return;

        // 1. 自动获取网页最后修改/发布时间
        const lastMod = new Date(document.lastModified);
        const autoUpdateDate = `${lastMod.getFullYear()}.${String(lastMod.getMonth() + 1).padStart(2, '0')}.${String(lastMod.getDate()).padStart(2, '0')}`;

        // 2. 左侧：版本与自动更新信息
        const createDateStr = footer.createDate || '';
        const separator = footer.createDate ? '，' : '';
        const updateDateStr = `${separator}${autoUpdateDate}`;
        const updateLinkHtml = footer.updateLink ? `<a href="${footer.updateLink}" style="color: #9ca3af; text-decoration: none; border-bottom: 1px dotted #d1d5db; margin-left: 12px; transition: color 0.2s;" onmouseover="this.style.color='#4b5563'" onmouseout="this.style.color='#9ca3af'">更新</a>` : '';

        // 3. 右侧：地址信息（彻底去掉W3C、电话、邮件）
        let contactsHTML = '';
        if (footer.contacts && footer.contacts.address && footer.contacts.address.text) {
            const value = footer.contacts.address;
            const targetAttr = value.coordinates?.target ? ` target="${value.coordinates.target}"` : '';
            const addrLink = value.coordinates ? `<a href="${value.coordinates.url}"${targetAttr} style="color: var(--primary-color, #059669); text-decoration: none; font-weight: 500; margin-left: 6px;">${value.coordinates.text}</a>` : '';
            
            // 合并为纯粹的一行
            contactsHTML = `${value.text}${addrLink}${value.suffix || ''}`;
        }

        // 4. 极简响应式布局注入
        // 去掉了 border-top 解决双横线问题。
        // justify-content: space-between 和 flex-wrap: wrap 完美实现电脑端一行，手机端两行。
        footerElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; color: var(--text-muted, #6b7280); font-size: 0.85rem; line-height: 1.6;">
                
                <div style="white-space: nowrap;">
                    ${createDateStr}${updateDateStr}${updateLinkHtml}
                </div>

                <div>
                    ${contactsHTML}
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
                // 🔥 强制数据驱动路由
                if (item.layout === 'tags') return this.renderTags(item);
                if (item.layout === 'cards') return this.renderCards(item);
                if (item.layout === 'timeline') return this.renderTimeline(item);
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

    // 🔥 独立的时间轴渲染器
    renderTimeline(listData) {
        let html = `<div class="timeline-container">`;
        listData.items.forEach(item => {
            let rawText = typeof item === 'string' ? item : (item.text || '');
            // 智能抓取开头的时间段
            const dateRegex = /^([0-9]{4}(?:\.[0-9]{1,2})?\s*(?:-|~|—)\s*(?:[0-9]{4}(?:\.[0-9]{1,2})?|至今|Present|Now)?)([,，:：\s]*)/;
            let dateStr = "";
            let contentHtml = this.renderComplexItemContent(item);
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
                        ${item.sublist ? `<ul class="timeline-sublist">${item.sublist.map(sub => `<li>${sub}</li>`).join('')}</ul>` : ''}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
        return html;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ModularContentRenderer();
    renderer.init(); 
});
