// 模块化内容渲染引擎
class ModularContentRenderer {
    constructor() {
        this.config = null;
        this.modules = new Map();
        this.isLoading = false;
        this.errorMessages = [];
        this.currentModule = null; // 当前显示的模块
    }

    // 显示加载状态
    showLoading() {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <p>正在加载内容...</p>
                </div>
            `;
        }
    }

    // 隐藏加载状态
    hideLoading() {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = '';
        }
    }

    // 显示错误信息
    showError(message) {
        this.errorMessages.push(message);
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <div class="error-container">
                    <h2>加载错误</h2>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    // 加载主配置文件
    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            this.config = await response.json();
        } catch (error) {
            console.error('无法加载主配置文件:', error);
            this.showError('无法加载配置文件，请检查网络连接');
        }
    }

    // 加载模块数据
    async loadModules() {
        try {
            for (const [moduleId, moduleConfig] of Object.entries(this.config.modules)) {
                if (moduleConfig.enabled) {
                    try {
                        const response = await fetch(`data/modules/${moduleConfig.file}`);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const moduleData = await response.json();
                        this.modules.set(moduleId, { ...moduleConfig, ...moduleData });
                    } catch (error) {
                        console.error(`无法加载模块 ${moduleId}:`, error);
                        this.showError(`无法加载模块 ${moduleId}: ${error.message}`);
                    }
                } else {
                }
            }
        } catch (error) {
            console.error('加载模块时发生错误:', error);
            this.showError('模块加载失败，请刷新页面重试');
        }
    }

    // 渲染页面头部
    renderHeader(headerConfig) {
        // 设置页面标题
        document.title = headerConfig.title;
        
        // 设置meta标签
        this.setMetaTags(headerConfig.meta);
        
        // 设置跳转链接
        const skipLink = document.querySelector('.skip-link');
        if (skipLink && headerConfig.skipLink) {
            skipLink.textContent = headerConfig.skipLink.text;
            skipLink.href = headerConfig.skipLink.target;
        }
    }

    // 设置meta标签
    setMetaTags(metaConfig) {
        if (metaConfig.description) {
            let descMeta = document.querySelector('meta[name="description"]');
            if (descMeta) descMeta.content = metaConfig.description;
        }
        
        if (metaConfig.keywords) {
            let keywordsMeta = document.querySelector('meta[name="keywords"]');
            if (keywordsMeta) keywordsMeta.content = metaConfig.keywords;
        }
        
        if (metaConfig.author) {
            let authorMeta = document.querySelector('meta[name="author"]');
            if (authorMeta) authorMeta.content = metaConfig.author;
        }
    }

    // 渲染个人信息
    renderProfile(profile) {
        const header = document.querySelector('header');
        if (!header) return;

        header.innerHTML = `
            <div class="header-content">
                <img src="${profile.photo}" alt="${profile.name}" class="profile-img">
                <div class="header-info">
                    <h1>${profile.name}</h1>
                    <div class="affiliation">
                        ${profile.affiliations.map(aff => 
                            `<p><a href="${aff.url}" target="_blank">${aff.name}</a></p>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染导航
    renderNavigation() {
        const nav = document.querySelector('nav ul');
        if (!nav) {
            // 创建nav元素
            const header = document.querySelector('header');
            if (header) {
                const newNav = document.createElement('nav');
                newNav.innerHTML = '<ul></ul>';
                header.appendChild(newNav);
                
                // 重新获取nav元素并设置内容
                const createdNav = document.querySelector('nav ul');
                if (createdNav) {
                    
                    let navHTML = '<li class="nav-brand">龚成明@DERI</li>';
                    navHTML += '<div class="nav-menu">';
                    
                    this.modules.forEach((moduleData, moduleId) => {
                        const isActive = moduleId === this.currentModule;
                        const activeClass = isActive ? 'active' : '';
                        navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
                    });
                    if (this.config.englishLink) {
                        navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
                    }
                    navHTML += '</div>';
                    
                    nav.innerHTML = navHTML;
                    
                    // 在nav元素创建后设置事件
                    this.setupNavigationEvents();
                }
            }
            return;
        }
        
        let navHTML = '<li class="nav-brand">龚成明@DERI</li>';
        navHTML += '<div class="nav-menu">';
        
        this.modules.forEach((moduleData, moduleId) => {
            const isActive = moduleId === this.currentModule;
            const activeClass = isActive ? 'active' : '';
            navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
        });
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
        }
        navHTML += '</div>';
        
        nav.innerHTML = navHTML;
        this.setupNavigationEvents();
    }

    // 设置导航事件
    setupNavigationEvents() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleId = link.getAttribute('data-module');
                this.switchModule(moduleId);
            });
        });
    }

    // 切换模块
    async switchModule(moduleId) {
        const moduleData = this.modules.get(moduleId);
        if (!moduleData) return;
        
        // 如果是当前模块且已经有内容，则返回
        if (moduleId === this.currentModule) {
            const existingSection = document.querySelector(`#${moduleId}`);
            if (existingSection && existingSection.innerHTML.trim() !== '') {
                return;
            }
        }
        
        this.currentModule = moduleId;
        this.updateNavigationHighlight();
        
        const main = document.querySelector('main');
        if (!main) return;
        
        // 清空并重新渲染内容
        main.innerHTML = '';
        
        if (moduleData.renderer === 'papers') {
            this.renderPapersModule(moduleData);
        } else {
            this.renderModule(moduleId, moduleData);
        }
        
        // 添加显示动画
        setTimeout(() => {
            const sections = main.querySelectorAll('section');
            sections.forEach(section => {
                section.classList.add('visible');
            });
        }, 100);
    }

    // 更新导航高亮
    updateNavigationHighlight() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const moduleId = link.getAttribute('data-module');
            if (moduleId === this.currentModule) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    // 渲染内容段落
    renderContentItem(item) {
        switch (item.type) {
            case 'paragraph':
                return `<p>${item.text}</p>`;
            
            case 'list':
                return this.renderList(item);
            
            case 'orderedList':
                return this.renderOrderedList(item);
            
            default:
                return '';
        }
    }

    // 渲染无序列表
    renderList(listData) {
        const listType = listData.listType || 'disc';
        let html = `<ul type="${listType}">`;
        
        listData.items.forEach(item => {
            if (typeof item === 'object') {
                html += this.renderComplexListItem(item);
            } else {
                html += `<li>${item}</li>`;
            }
        });
        
        html += '</ul>';
        return html;
    }

    // 渲染有序列表
    renderOrderedList(listData) {
        const start = listData.start || 1;
        let html = `<ul class="custom-list">`;
        
        listData.items.forEach(item => {
            html += `<li>${this.renderComplexItemContent(item)}</li>`;
        });
        
        html += '</ul>';
        return html;
    }

    // 渲染复杂列表项
    renderComplexListItem(item) {
        if (typeof item === 'string') {
            return `<li>${item}</li>`;
        }
        
        let html = '<li>';
        html += this.renderComplexItemContent(item);
        
        if (item.sublist) {
            html += '<ul>';
            item.sublist.forEach(subitem => {
                html += `<li>${subitem}</li>`;
            });
            html += '</ul>';
        }
        
        html += '</li>';
        return html;
    }

    // 渲染复杂项内容（包含链接等）
    renderComplexItemContent(item) {
        if (typeof item === 'string') {
            // 如果字符串包含HTML标签，直接返回
            if (item.includes('<a href=')) {
                return item;
            }
            return item;
        }
        
        let content = item.text || '';
        
        // 处理主要链接 - 使用更精确的替换
        if (item.links) {
            item.links.forEach(link => {
                const linkHTML = `<a href="${link.url}"${link.target ? ` target="${link.target}"` : ''}>${link.text}</a>`;
                content = content.replace(new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), linkHTML);
            });
        }
        
        // 处理后缀
        if (item.suffix) {
            content += item.suffix;
        }
        
        // 处理第二组链接
        if (item.links2) {
            item.links2.forEach(link => {
                const linkHTML = `<a href="${link.url}">${link.text}</a>`;
                content = content.replace(new RegExp(link.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), linkHTML);
            });
        }
        
        // 处理第二后缀
        if (item.suffix2) {
            content += item.suffix2;
        }
        
        // 处理工具提示
        if (item.class === 'tip' && item.abstract) {
            const tipId = `tip_${Math.random().toString(36).substr(2, 9)}`;
            content = `<a class="tip" href="${item.url || '#'}"><span id="${tipId}_info"><strong>ABSTRACT</strong>: ${item.abstract}</span>${content}</a>`;
        }
        
        // 处理其他链接
        if (item.links && !item.class) {
            item.links.forEach(link => {
                content += ` <a href="${link.url}">${link.text}</a>`;
            });
        }
        
        return content;
    }

    // 渲染页脚
    renderFooter(footer) {
        const footerElement = document.querySelector('footer');
        if (!footerElement) return;

        // 获取当前日期作为更新时间
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const updateDate = `${year}年${month}月${day}日`;

        // 渲染联系方式
        let contactsHTML = '';
        if (footer.contacts) {
            const contacts = footer.contacts;
            
            // 地址
            let addressHTML = '';
            if (contacts.address) {
                const addr = contacts.address;
                const coordLink = addr.coordinates ? 
                    `<a href="${addr.coordinates.url}" target="${addr.coordinates.target || '_blank'}">${addr.coordinates.text}</a>` : '';
                addressHTML = `
                    <div class="contact-item">
                        <strong>地址：</strong>${addr.text}${coordLink}${addr.suffix || ''}
                    </div>
                `;
            }
            
            // 电话
            const phoneHTML = contacts.phone ? 
                `<div class="contact-item"><strong>电话：</strong>${contacts.phone}</div>` : '';
            
            // 邮箱
            let emailHTML = '';
            if (contacts.email && Array.isArray(contacts.email)) {
                const emails = contacts.email.map(email => 
                    `<a href="mailto:${email.display}${email.domain}">${email.display}${email.domain}</a>`
                ).join('; ');
                emailHTML = `<div class="contact-item"><strong>电子邮件：</strong>${emails}</div>`;
            }
            
            contactsHTML = `
                <div class="footer-contacts">
                    <h3>联系方式</h3>
                    ${addressHTML}
                    ${phoneHTML}
                    ${emailHTML}
                </div>
            `;
        }

        footerElement.innerHTML = `
            <div class="footer-content">
                <div class="footer-info">
                    <p>${footer.createDate}，${updateDate}<a href="${footer.updateLink}">更新</a></p>
                    <p><a href="${footer.cssValidator.url}"><img style="border: 0; width: 88px; height: 31px" src="${footer.cssValidator.img}" alt="${footer.cssValidator.alt}" /></a></p>
                </div>
                ${contactsHTML}
            </div>
        `;
    }

    // 渲染所有内容
    async renderAll() {
        try {
            this.isLoading = true;
            this.showLoading();
            
            // 加载主配置
            await this.loadConfig();
            if (!this.config) {
                throw new Error('无法加载主配置文件');
            }

            // 渲染页面头部
            this.renderHeader(this.config.header);
            
            // 渲染个人信息
            this.renderProfile(this.config.profile);
            
            // 加载所有模块
            await this.loadModules();
            
            // 清空main内容
            const main = document.querySelector('main');
            if (main) {
                main.innerHTML = '';
            }
            
            // 设置默认活动模块为第一个启用的模块
            const enabledModules = Array.from(this.modules.entries())
                .filter(([moduleId, moduleData]) => moduleData.enabled)
                .sort(([, a], [, b]) => a.order - b.order);
            
            console.log('🔍 启用的模块:', enabledModules);
            
            if (enabledModules.length > 0) {
                this.currentModule = enabledModules[0][0];
                console.log('🔍 设置默认模块:', this.currentModule);
            }
            
            // 动态生成导航菜单
            this.renderNavigation();
            
            // 只渲染当前活动模块
            if (this.currentModule && this.modules.has(this.currentModule)) {
                const moduleData = this.modules.get(this.currentModule);
                if (moduleData.renderer === 'papers') {
                    this.renderPapersModule(moduleData);
                } else {
                    this.renderModule(this.currentModule, moduleData);
                    // 为默认模块添加visible类
                    setTimeout(() => {
                        const section = document.querySelector(`#${this.currentModule}`);
                        if (section) {
                            section.classList.add('visible');
                        }
                    }, 100);
                }
            }
            
            // 渲染页脚
            this.renderFooter(this.config.footer);
            
            this.isLoading = false;
        } catch (error) {
            this.isLoading = false;
            console.error('渲染过程中发生错误:', error);
            this.showError('内容加载失败，请刷新页面重试');
        }
    }

    // 渲染指定模块
    renderModule(moduleId, moduleData) {
        console.log('🔍 renderModule 被调用:', moduleId, moduleData);
        const main = document.querySelector('main');
        if (!main) return;

        let sectionHTML = `<section id="${moduleId}">`;
        
        console.log('🔍 模块内容:', moduleData.content);
        moduleData.content.forEach(item => {
            sectionHTML += this.renderContentItem(item);
        });
        
        // 处理模块底部的链接（如论文页面的Google Scholar链接）
        if (moduleData.footerLink) {
            sectionHTML += `<a href="${moduleData.footerLink.url}">${moduleData.footerLink.text}</a>`;
        }
        
        sectionHTML += '</section>';
        
        console.log('🔍 生成的HTML:', sectionHTML);
        main.innerHTML = sectionHTML;
    }

    // 渲染论文模块
    renderPapersModule(moduleData) {
        const main = document.querySelector('main');
        if (!main) return;

        // 清空并重新渲染内容
        main.innerHTML = '';

        // 创建论文容器
        let papersHTML = '<section id="papers" class="visible">';
        papersHTML += '<h2>主要论文</h2>';
        papersHTML += '<div class="papers-container">';

        // 渲染论文列表
        if (moduleData.papers && Array.isArray(moduleData.papers)) {
            moduleData.papers.forEach((paper, index) => {
                papersHTML += this.renderPaperItem(paper, index + 1);
            });
        }

        papersHTML += '</div>';
        papersHTML += '</section>';

        main.innerHTML = papersHTML;
    }

    // 渲染单个论文项
    renderPaperItem(paper, index) {
        const authorsHTML = this.renderAuthors(paper.authors);
        const keywordsHTML = this.renderKeywords(paper.keywords);
        const keywordsEnHTML = this.renderKeywords(paper.keywordsEn);
        
        let citationHTML = '';
        
        if (paper.type === 'journal') {
            const doiLink = paper.doi ? `DOI: <a href="https://doi.org/${paper.doi}" target="_blank">${paper.doi}</a>` : '';
            citationHTML = `
                <div class="paper-item journal-paper">
                    <div class="paper-header">
                        <span class="paper-index">${index}.</span>
                        <div class="paper-title">
                            ${paper.titleEn}
                            <br>
                            <span class="paper-title-zh">${paper.title}</span>
                        </div>
                    </div>
                    <div class="paper-authors">${authorsHTML}</div>
                    <div class="paper-journal">
                        <em>${paper.journalEn}</em> (${paper.journal}), ${paper.year}, <strong>${paper.volume}</strong>(${paper.issue}): ${paper.pages}. 
                        ${doiLink}
                    </div>
                    ${keywordsHTML ? `<div class="paper-keywords"><strong>关键词:</strong> ${keywordsHTML}</div>` : ''}
                    ${keywordsEnHTML ? `<div class="paper-keywords-en"><strong>Keywords:</strong> ${keywordsEnHTML}</div>` : ''}
                    <div class="paper-abstract">
                        <strong>摘要:</strong> ${paper.abstract}
                    </div>
                    ${paper.abstractEn ? `<div class="paper-abstract-en"><strong>Abstract:</strong> ${paper.abstractEn}</div>` : ''}
                </div>
            `;
        } else if (paper.type === 'conference') {
            console.log('Rendering conference paper');
            const doiLink = paper.doi ? `DOI: <a href="https://doi.org/${paper.doi}" target="_blank">${paper.doi}</a>` : '';
            citationHTML = `
                <div class="paper-item conference-paper">
                    <div class="paper-header">
                        <span class="paper-index">${index}.</span>
                        <div class="paper-title">
                            ${paper.titleEn}
                            <br>
                            <span class="paper-title-zh">${paper.title}</span>
                        </div>
                    </div>
                    <div class="paper-authors">${authorsHTML}</div>
                    <div class="paper-conference">
                        <em>${paper.conference}</em>, ${paper.location}, ${paper.year}, pp. ${paper.pages}. 
                        ${doiLink}
                    </div>
                    ${keywordsHTML ? `<div class="paper-keywords"><strong>关键词:</strong> ${keywordsHTML}</div>` : ''}
                    ${keywordsEnHTML ? `<div class="paper-keywords-en"><strong>Keywords:</strong> ${keywordsEnHTML}</div>` : ''}
                    <div class="paper-abstract">
                        <strong>摘要:</strong> ${paper.abstract}
                    </div>
                    ${paper.abstractEn ? `<div class="paper-abstract-en"><strong>Abstract:</strong> ${paper.abstractEn}</div>` : ''}
                </div>
            `;
        } else if (paper.type === 'preprint') {
            console.log('Rendering preprint paper');
            citationHTML = `
                <div class="paper-item preprint-paper">
                    <div class="paper-header">
                        <span class="paper-index">${index}.</span>
                        <div class="paper-title">
                            ${paper.titleEn}
                            <br>
                            <span class="paper-title-zh">${paper.title}</span>
                        </div>
                    </div>
                    <div class="paper-authors">${authorsHTML}</div>
                    <div class="paper-journal">
                        <em>${paper.journalEn}</em>, ${paper.year}, ${paper.pages}. 
                        ${paper.doi ? `arXiv: <a href="https://arxiv.org/abs/${paper.doi.replace('arXiv:', '')}" target="_blank">${paper.doi}</a>` : ''}
                    </div>
                    ${keywordsHTML ? `<div class="paper-keywords"><strong>关键词:</strong> ${keywordsHTML}</div>` : ''}
                    ${keywordsEnHTML ? `<div class="paper-keywords-en"><strong>Keywords:</strong> ${keywordsEnHTML}</div>` : ''}
                    <div class="paper-abstract">
                        <strong>摘要:</strong> ${paper.abstract}
                    </div>
                    ${paper.abstractEn ? `<div class="paper-abstract-en"><strong>Abstract:</strong> ${paper.abstractEn}</div>` : ''}
                </div>
            `;
        } else {
            console.log('Unknown paper type:', paper.type);
        }
        
        console.log(`citationHTML for paper ${index}:`, citationHTML);
        return citationHTML;
    }

    // 渲染作者列表
    renderAuthors(authors) {
        return authors.map(author => 
            `<span class="author">${author.nameEn} (${author.name})</span>`
        ).join(', ');
    }

    // 渲染关键词
    renderKeywords(keywords) {
        if (!keywords || keywords.length === 0) return '';
        return keywords.join('; ');
    }

    // 获取关键词的中文显示
    getKeywordsDisplay(keywords, keywordsEn) {
        const zhKeywords = this.renderKeywords(keywords);
        const enKeywords = this.renderKeywords(keywordsEn);
        
        if (zhKeywords && enKeywords) {
            return `${zhKeywords} (${enKeywords})`;
        } else if (zhKeywords) {
            return zhKeywords;
        } else if (enKeywords) {
            return enKeywords;
        }
        return '';
    }

    // 获取模块列表
    getModuleList() {
        const moduleList = [];
        this.modules.forEach((moduleData, moduleId) => {
            moduleList.push({
                id: moduleId,
                title: moduleData.title,
                order: moduleData.order,
                file: moduleData.file
            });
        });
        return moduleList.sort((a, b) => a.order - b.order);
    }
}

// 初始化模块化渲染器
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔥🔥🔥 DOMContentLoaded 事件触发! 🔥🔥🔥');
    
    const renderer = new ModularContentRenderer();
    console.log('🔥 ModularContentRenderer 实例已创建');
    
    await renderer.renderAll();
    console.log('🔥 renderAll 调用完成');
});
