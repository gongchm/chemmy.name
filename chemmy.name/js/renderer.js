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
            console.log('主配置加载成功:', this.config);
        } catch (error) {
            console.error('无法加载主配置文件:', error);
            this.showError('无法加载配置文件，请检查网络连接');
        }
    }

    // 加载模块数据
    async loadModules() {
        try {
            console.log('开始加载模块，config.modules:', this.config.modules);
            for (const [moduleId, moduleConfig] of Object.entries(this.config.modules)) {
                console.log(`处理模块 ${moduleId}, 配置:`, moduleConfig);
                if (moduleConfig.enabled) {
                    try {
                        const response = await fetch(`data/modules/${moduleConfig.file}`);
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        const moduleData = await response.json();
                        this.modules.set(moduleId, { ...moduleConfig, ...moduleData });
                        console.log(`模块 ${moduleId} 加载成功:`, moduleData);
                    } catch (error) {
                        console.error(`无法加载模块 ${moduleId}:`, error);
                        this.showError(`无法加载模块 ${moduleId}: ${error.message}`);
                    }
                } else {
                    console.log(`模块 ${moduleId} 已禁用，跳过加载`);
                }
            }
        } catch (error) {
            console.error('加载模块时发生错误:', error);
            this.showError('模块加载失败，请刷新页面重试');
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
        console.log('🔥🔥🔥 renderNavigation 被调用了! 🔥🔥🔥');
        
        const nav = document.querySelector('nav ul');
        console.log('🔥 nav element:', nav);
        console.log('🔥 document.querySelector("nav"):', document.querySelector('nav'));
        console.log('🔥 document.querySelector("nav ul"):', document.querySelector('nav ul'));
        console.log('🔥 document.querySelectorAll("nav ul"):', document.querySelectorAll('nav ul'));
        
        if (!nav) {
            console.log('🔥 ERROR: nav element not found! 创建nav元素...');
            // 创建nav元素
            const header = document.querySelector('header');
            if (header) {
                const newNav = document.createElement('nav');
                newNav.innerHTML = '<ul></ul>';
                header.appendChild(newNav);
                console.log('🔥 创建了新的nav元素:', newNav);
                
                // 重新获取nav元素并设置内容
                const createdNav = document.querySelector('nav ul');
                if (createdNav) {
                    console.log('🔥 重新获取到创建的nav元素:', createdNav);
                    
                    let navHTML = '<li class="nav-brand">龚成明@DERI</li>';
                    navHTML += '<div class="nav-menu">';
                    
                    this.modules.forEach((moduleId, moduleData) => {
                        console.log(`🔥 处理模块 ${moduleId}:`, moduleData);
                        const isActive = moduleId === this.currentModule;
                        const activeClass = isActive ? 'active' : '';
                        navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
                    });
                    if (this.config.englishLink) {
                        navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
                    }
                    navHTML += '</div>';
                    
                    console.log('🔥 生成的navHTML:', navHTML);
                    createdNav.innerHTML = navHTML;
                    console.log('🔥 nav.innerHTML 设置完成');
                    
                    // 在nav元素创建后设置事件
                    this.setupNavigationEvents();
                }
            }
            return;
        }
        
        console.log('🔥 this.modules:', this.modules);
        console.log('🔥 this.modules.size:', this.modules.size);
        console.log('🔥 this.currentModule:', this.currentModule);

        let navHTML = '<li class="nav-brand">龚成明@DERI</li>';
        navHTML += '<div class="nav-menu">';
        
        this.modules.forEach((moduleId, moduleData) => {
            console.log(`🔥 处理模块 ${moduleId}:`, moduleData);
            console.log(`🔥 模块数据结构:`, {
                id: moduleId,
                title: moduleData.title,
                enabled: moduleData.enabled,
                order: moduleData.order
            });
            const isActive = moduleId === this.currentModule;
            const activeClass = isActive ? 'active' : '';
            navHTML += `<li><a href="#${moduleId}" class="nav-link ${activeClass}" data-module="${moduleId}">${moduleData.title}</a></li>`;
        });
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
        }
        navHTML += '</div>';
        
        console.log('🔥 生成的navHTML:', navHTML);
        nav.innerHTML = navHTML;
        console.log('🔥 nav.innerHTML 设置完成');
        
        this.setupNavigationEvents();
    }

    // 设置导航事件
    setupNavigationEvents() {
        console.log('🔥🔥🔥 setupNavigationEvents 被调用了! 🔥🔥🔥');
        
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('🔥 找到的navLinks数量:', navLinks.length);
        console.log('🔥 navLinks详情:', Array.from(navLinks).map(link => ({ text: link.textContent, module: link.getAttribute('data-module') })));
        
        // 添加直接的点击测试
        navLinks.forEach((link, index) => {
            console.log(`🔥 navLink ${index}:`, link.textContent, '->', link.getAttribute('data-module'));
            
            // 添加鼠标悬停测试
            link.addEventListener('mouseenter', () => {
                console.log('🔥 鼠标悬停在:', link.textContent);
            });
            
            link.addEventListener('click', (e) => {
                console.log('🔥🔥🔥 导航链接被点击! 🔥🔥🔥');
                console.log('🔥 点击的链接:', link.textContent);
                console.log('🔥 目标模块:', link.getAttribute('data-module'));
                console.log('🔥 事件对象:', e);
                console.log('🔥 阻止默认行为前...');
                
                e.preventDefault();
                e.stopPropagation();
                
                console.log('🔥 阻止默认行为后，调用 switchModule');
                const moduleId = link.getAttribute('data-module');
                console.log('🔥 调用 switchModule:', moduleId);
                this.switchModule(moduleId);
            });
        });
        
        // 添加全局点击测试
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                console.log('🔥🔥🔥 全局点击事件捕获到导航链接! 🔥🔥🔥');
                console.log('🔥 点击的目标:', e.target.textContent);
            }
        });
    }

    // 切换模块
    async switchModule(moduleId) {
        console.log('🔥🔥🔥 switchModule 被调用了! 🔥🔥🔥');
        console.log('🔥 moduleId:', moduleId);
        console.log('🔥 currentModule:', this.currentModule);
        
        if (moduleId === this.currentModule) {
            console.log('🔥 模块相同，返回');
            return;
        }
        
        this.currentModule = moduleId;
        this.updateNavigationHighlight();
        
        const main = document.querySelector('main');
        if (!main) {
            console.log('🔥 ERROR: main element not found in switchModule!');
            return;
        }
        
        const moduleData = this.modules.get(moduleId);
        if (!moduleData) {
            console.log('🔥 ERROR: moduleData not found for:', moduleId);
            return;
        }
        
        console.log('🔥 moduleData:', moduleData);
        
        // 清空并重新渲染内容
        main.innerHTML = '';
        
        if (moduleId === 'papers') {
            console.log('🔥🔥🔥 调用 renderPapersModule! 🔥🔥🔥');
            try {
                this.renderPapersModule(moduleData);
                console.log('🔥🔥🔥 renderPapersModule 调用成功! 🔥🔥🔥');
            } catch (error) {
                console.error('🔥🔥🔥 renderPapersModule 调用失败! 🔥🔥🔥');
                console.error('🔥 错误详情:', error);
                console.error('🔥 错误堆栈:', error.stack);
            }
        } else {
            console.log('🔥 调用 renderModule for:', moduleId);
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
            
            // 清空main内容
            const main = document.querySelector('main');
            if (main) {
                main.innerHTML = '';
            }
            
            // 设置默认活动模块为第一个启用的模块
            const enabledModules = Array.from(this.modules.entries())
                .filter(([moduleId, moduleData]) => moduleData.enabled)
                .sort(([, a], [, b]) => a.order - b.order);
            
            if (enabledModules.length > 0) {
                this.currentModule = enabledModules[0][0];
                console.log('🔥 设置默认模块:', this.currentModule);
            }
            
            // 动态生成导航菜单
            this.renderNavigation();
            
            // 只渲染当前活动模块
            if (this.currentModule && this.modules.has(this.currentModule)) {
                const moduleData = this.modules.get(this.currentModule);
                if (this.currentModule === 'papers') {
                    this.renderPapersModule(moduleData);
                } else {
                    this.renderModule(this.currentModule, moduleData);
                }
            }
            
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

    // 渲染指定模块
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

    // 渲染论文模块
    renderPapersModule(moduleData) {
        console.log('🔥🔥🔥 renderPapersModule 被调用了! 🔥🔥🔥');
        console.log('🔥 moduleData:', moduleData);
        
        // 创建绝对定位的测试元素，绕过所有CSS
        const absoluteTest = document.createElement('div');
        absoluteTest.style.cssText = `
            position: fixed !important;
            top: 50px !important;
            left: 50px !important;
            width: 300px !important;
            height: 100px !important;
            background: lime !important;
            color: black !important;
            padding: 20px !important;
            z-index: 99999 !important;
            font-size: 18px !important;
            font-weight: bold !important;
            border: 3px solid red !important;
        `;
        absoluteTest.textContent = 'ABSOLUTE TEST - 论文模块';
        document.body.appendChild(absoluteTest);
        
        const main = document.querySelector('main');
        console.log('🔥 main element:', main);
        
        if (!main) {
            console.log('🔥 ERROR: main element not found!');
            return;
        }
        
        // 第一步：清空main
        console.log('🔥 步骤1: 清空main');
        main.innerHTML = '';
        console.log('🔥 main.innerHTML after clear:', main.innerHTML);
        
        // 第二步：创建简单的测试内容
        console.log('🔥 步骤2: 创建简单测试内容');
        const testHTML = '<div style="background: yellow !important; padding: 20px !important; margin: 10px !important; font-size: 24px !important; font-weight: bold !important; border:5px solid blue !important;">测试内容：论文模块</div>';
        main.innerHTML = testHTML;
        console.log('🔥 main.innerHTML after test:', main.innerHTML);
        console.log('🔥 main的完整HTML结构:', main.outerHTML);
        
        // 第三步：检查是否可见
        setTimeout(() => {
            console.log('🔥 步骤3: 检查测试内容是否可见');
            const testDiv = main.querySelector('div');
            if (testDiv) {
                console.log('🔥 测试div存在:', !!testDiv);
                console.log('🔥 测试div样式:', testDiv.style.cssText);
                console.log('🔥 测试div是否可见:', testDiv.offsetWidth > 0 && testDiv.offsetHeight > 0);
                console.log('🔥 测试div尺寸:', testDiv.offsetWidth, 'x', testDiv.offsetHeight);
                console.log('🔥 测试div计算样式:', window.getComputedStyle(testDiv).cssText);
                console.log('🔥 main元素计算样式:', window.getComputedStyle(main).cssText);
            }
        }, 100);
        
        console.log('🔥🔥🔥 renderPapersModule 结束 🔥🔥🔥');
    }

    // 渲染单个论文项
    renderPaperItem(paper, index) {
        console.log(`renderPaperItem called for paper ${index}:`, paper.title);
        console.log(`paper type:`, paper.type);
        
        const authorsHTML = this.renderAuthors(paper.authors);
        const keywordsHTML = this.renderKeywords(paper.keywords);
        const keywordsEnHTML = this.renderKeywords(paper.keywordsEn);
        
        console.log(`authorsHTML:`, authorsHTML);
        console.log(`keywordsHTML:`, keywordsHTML);
        
        let citationHTML = '';
        
        if (paper.type === 'journal') {
            console.log('Rendering journal paper');
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
        this.modules.forEach((moduleId, moduleData) => {
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
