// 模块化内容渲染引擎 (优化重构版)
class ModularContentRenderer {
    constructor() {
        this.config = null;
        this.modules = new Map();
        this.isLoading = false;
        this.errorMessages = [];
        this.currentModule = null; // 当前激活的模块ID
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
        // 优化：使用 Promise.all 实现模块配置的并行下载，大幅提升首屏加载速度
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
            
            // 确定默认激活的模块（按 order 排序的第一个）
            const enabledModules = Array.from(this.modules.entries())
                .sort(([, a], [, b]) => a.order - b.order);
            
            if (enabledModules.length > 0) {
                this.currentModule = enabledModules[0][0]; // 获取第一个 moduleId
            }
            
            this.renderNavigation();
            this.renderFooter(this.config.footer);
            
            // 首屏渲染当前模块
            this.renderCurrentModule();
            
        } catch (error) {
            this.showError('初始化失败，请检查网络或配置文件。');
        } finally {
            this.isLoading = false;
        }
    }

    // --- 交互与视图更新层 ---
    switchModule(moduleId) {
        if (!this.modules.has(moduleId)) return;
        if (this.currentModule === moduleId) return; // 优化：状态相同直接拦截，不查 DOM
        
        this.currentModule = moduleId;
        this.updateNavigationHighlight();
        this.renderCurrentModule(); // 统一调用核心渲染方法
    }

    // 核心重构：统一的模块渲染出口，直接注入 HTML，消除所有 setTimeout
    renderCurrentModule() {
        const main = document.querySelector('main');
        if (!main) return;
        
        const moduleData = this.modules.get(this.currentModule);
        if (!moduleData) return;

        let html = '';
        // 建议在你的 CSS 文件中加入 .fade-in 的动画效果
        // 只要注入带有 .fade-in 的 DOM，浏览器会自动播放动画，无需 JS 介入
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

    // --- HTML 构建器 (纯函数设计，不直接操作 DOM) ---
    buildStandardHtml(moduleId, moduleData) {
        // 直接在 section 上增加 visible 或 fade-in 类
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
        html += '<h2>主要论文</h2><div class="papers-container">';
        if (moduleData.papers && Array.isArray(moduleData.papers)) {
            moduleData.papers.forEach((paper, index) => {
                html += this.renderPaperItem(paper, index + 1);
            });
        }
        html += '</div></section>';
        return html;
    }

    // --- 基础组件渲染逻辑 (保留原版逻辑，仅做精简整理) ---
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
        header.innerHTML = `
            <div class="header-content">
                <img src="${profile.photo}" alt="${profile.name}" class="profile-img">
                <div class="header-info">
                    <h1>${profile.name}</h1>
                    <div class="affiliation">
                        ${profile.affiliations.map(aff => `<p><a href="${aff.url}" target="_blank">${aff.name}</a></p>`).join('')}
                    </div>
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
        
        // 重新绑定事件
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
        const now = new Date();
        const updateDate = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;

        let contactsHTML = '';
        if (footer.contacts) {
            const c = footer.contacts;
            const addrLink = c.address?.coordinates ? `<a href="${c.address.coordinates.url}" target="_blank">${c.address.coordinates.text}</a>` : '';
            const emails = Array.isArray(c.email) ? c.email.map(e => `<a href="mailto:${e.display}${e.domain}">${e.display}${e.domain}</a>`).join('; ') : '';
            
            contactsHTML = `<div class="footer-contacts"><h3>联系方式</h3>` +
                (c.address ? `<div class="contact-item"><strong>地址：</strong>${c.address.text}${addrLink}${c.address.suffix || ''}</div>` : '') +
                (c.phone ? `<div class="contact-item"><strong>电话：</strong>${c.phone}</div>` : '') +
                (emails ? `<div class="contact-item"><strong>电子邮件：</strong>${emails}</div>` : '') +
                `</div>`;
        }

        footerElement.innerHTML = `
            <div class="footer-content">
                <div class="footer-info">
                    <p>${footer.createDate}，${updateDate}<a href="${footer.updateLink}">更新</a></p>
                    <p><a href="${footer.cssValidator.url}"><img style="border:0;width:88px;height:31px" src="${footer.cssValidator.img}" alt="${footer.cssValidator.alt}" /></a></p>
                </div>
                ${contactsHTML}
            </div>
        `;
    }

    renderContentItem(item) {
        switch (item.type) {
            case 'paragraph': return `<p>${item.text}</p>`;
            case 'list': return this.renderList(item);
            case 'orderedList': return this.renderOrderedList(item);
            default: return '';
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
}

// 启动入口统一变更为 init()
document.addEventListener('DOMContentLoaded', () => {
    const renderer = new ModularContentRenderer();
    renderer.init(); 
});
