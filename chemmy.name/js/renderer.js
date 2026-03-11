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

    // 显示错误信息
    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
                <div class="error-container">
                    <h2>加载失败</h2>
                    <p>${message}</p>
                    <button onclick="location.reload()">重新加载</button>
                </div>
            `;
        }
    }

    // 加载主配置文件
    async loadConfig() {
        try {
            console.log('开始加载主配置文件...');
            const response = await fetch('data/config.json');
            this.config = await response.json();
            console.log('主配置文件加载成功:', this.config);
            return this.config;
        } catch (error) {
            console.error('加载主配置文件失败:', error);
            return null;
        }
    }

    // 加载模块内容
    async loadModule(moduleFile) {
        try {
            const response = await fetch(`data/modules/${moduleFile}`);
            const moduleData = await response.json();
            return moduleData;
        } catch (error) {
            console.error(`加载模块 ${moduleFile} 失败:`, error);
            return null;
        }
    }

    // 加载所有启用的模块
    async loadModules() {
        if (!this.config) return;

        const enabledModules = this.config.modules
            .filter(module => module.enabled)
            .sort((a, b) => a.order - b.order);

        console.log('启用的模块:', enabledModules);

        // 并行加载所有模块
        const modulePromises = enabledModules.map(async (module) => {
            console.log(`正在加载模块: ${module.file}`);
            const moduleData = await this.loadModule(module.file);
            if (moduleData) {
                console.log(`模块 ${module.file} 加载成功:`, moduleData);
                return { id: module.id, ...module, ...moduleData };
            }
            return null;
        });

        const results = await Promise.all(modulePromises);
        
        // 存储成功加载的模块
        results.forEach(result => {
            if (result) {
                this.modules.set(result.id, result);
                console.log(`模块 ${result.id} 已存储:`, result);
            }
        });
    }

    // 渲染个人信息头部
    renderProfile(profile) {
        const header = document.querySelector('header');
        if (!header) return;

        let affiliationsHTML = '';
        profile.affiliations.forEach(aff => {
            affiliationsHTML += `<p><a href="${aff.url}">${aff.name}</a></p>`;
        });

        header.innerHTML = `
            <div class="header-content">
                <img src="${profile.photo}" alt="${profile.name}" class="profile-img" />
                <div class="header-info">
                    <h1>${profile.name}</h1>
                    <div class="affiliation">
                        ${affiliationsHTML}
                    </div>
                </div>
            </div>
        `;
    }

    // 动态生成导航菜单
    renderNavigation() {
        const nav = document.querySelector('nav ul');
        if (!nav) return;

        let navHTML = '';
        
        // 按顺序渲染所有启用的模块
        this.modules.forEach((moduleData, moduleId) => {
            // 默认显示第一个模块
            if (this.currentModule === null && moduleId === Array.from(this.modules.keys())[0]) {
                this.currentModule = moduleId;
            }
            
            const isActive = moduleId === this.currentModule;
            const activeClass = isActive ? 'active' : '';
            navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
        });
        
        // 添加英文链接
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
        }

        nav.innerHTML = navHTML;
        
        // 添加导航点击事件
        this.setupNavigationEvents();
    }

    // 设置导航事件
    setupNavigationEvents() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const moduleId = link.getAttribute('data-module');
                this.showModule(moduleId);
            });
        });
    }

    // 显示指定模块
    showModule(moduleId) {
        this.currentModule = moduleId;
        
        // 更新导航高亮
        this.updateNavigationHighlight();
        
        // 只显示选中的模块内容
        const main = document.querySelector('main');
        if (!main) return;
        
        const moduleData = this.modules.get(moduleId);
        if (!moduleData) return;
        
        // 清空并重新渲染内容
        main.innerHTML = '';
        
        if (moduleId === 'papers') {
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
        
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // 渲染论文模块
    renderPapersModule(modulesData) {
        const main = document.querySelector('main');
        if (!main || !modulesData.papers) return;

        let papersHTML = '';
        
        modulesData.papers.forEach((paper, index) => {
            papersHTML += this.renderPaperItem(paper, index + 1);
        });

        main.innerHTML = `<section id="papers">
            <div class="papers-container">
                ${papersHTML}
            </div>
        </section>`;
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
        }
        
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

        footerElement.innerHTML = `
            <p>${updateDate}<a href="${footer.updateLink}">更新</a></p>
            <p>${footer.createDate}</p>
            <p><a href="${footer.cssValidator.url}"><img style="border: 0; width: 88px; height: 31px" src="${footer.cssValidator.img}" alt="${footer.cssValidator.alt}" /></a></p>
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

            // 渲染个人信息
            this.renderProfile(this.config.profile);
            
            // 加载所有模块
            await this.loadModules();
            
            // 动态生成导航菜单
            this.renderNavigation();
            
            // 清空main内容
            const main = document.querySelector('main');
            if (main) {
                main.innerHTML = '';
            }
            
            // 按顺序渲染所有启用的模块
            this.modules.forEach((moduleData, moduleId) => {
                if (moduleId === 'papers') {
                    this.renderPapersModule(moduleData);
                } else {
                    this.renderModule(moduleId, moduleData);
                }
            });
            
            // 渲染页脚
            this.renderFooter(this.config.footer);
            
            this.isLoading = false;
            console.log('模块化内容渲染完成');
            console.log(`已加载 ${this.modules.size} 个模块`);
            
        } catch (error) {
            this.isLoading = false;
            console.error('渲染过程中发生错误:', error);
            this.showError('内容加载失败，请刷新页面重试');
        }
    }

    // 渲染模块
    renderModule(moduleId, moduleData) {
        const main = document.querySelector('main');
        if (!main) return;

        let sectionHTML = `<section id="${moduleId}">`;
        
        moduleData.content.forEach(item => {
            sectionHTML += this.renderContentItem(item);
        });
        
        // 处理模块底部的链接（如论文页面的Google Scholar链接）
        if (moduleData.footerLink) {
            sectionHTML += `<a href="${moduleData.footerLink.url}">${moduleData.footerLink.text}</a>`;
        }
        
        sectionHTML += '</section>';
        
        main.innerHTML += sectionHTML;
    }

    // 获取模块列表（用于调试）
    getModuleList() {
        const moduleList = [];
        this.modules.forEach((module, moduleId) => {
            moduleList.push({
                id: moduleId,
                title: module.title,
                order: module.order,
                file: module.file
            });
        });
        return moduleList.sort((a, b) => a.order - b.order);
    }
}

// 初始化模块化渲染器
document.addEventListener('DOMContentLoaded', async () => {
    const renderer = new ModularContentRenderer();
    await renderer.renderAll();
    
    // 在控制台输出模块信息（调试用）
    console.log('已加载的模块:', renderer.getModuleList());
});
