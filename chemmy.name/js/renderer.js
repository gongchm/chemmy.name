// 模块化内容渲染引擎
class ModularContentRenderer {
    constructor() {
        this.config = null;
        this.modules = new Map();
    }

    // 加载主配置文件
    async loadConfig() {
        try {
            const response = await fetch('data/config.json');
            this.config = await response.json();
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

        for (const module of enabledModules) {
            const moduleData = await this.loadModule(module.file);
            if (moduleData) {
                this.modules.set(module.id, {
                    ...module,
                    ...moduleData
                });
            }
        }
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
            <img src="${profile.photo}" alt="${profile.name}" class="profile-img" />
            <h1>${profile.name}</h1>
            <div class="affiliation">
                ${affiliationsHTML}
            </div>
        `;
    }

    // 动态生成导航菜单
    renderNavigation() {
        const nav = document.querySelector('nav ul');
        if (!nav) return;

        let navHTML = '';
        
        // 根据启用的模块生成导航
        this.modules.forEach((module, moduleId) => {
            navHTML += `<li><a href="#${moduleId}">${module.title}</a></li>`;
        });
        
        // 添加英文链接
        if (this.config.englishLink) {
            navHTML += `<li><a href="${this.config.englishLink.url}" class="english-link">${this.config.englishLink.text}</a></li>`;
        }

        nav.innerHTML = navHTML;
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
        let html = `<ol start="${start}" type="1">`;
        
        listData.items.forEach(item => {
            html += `<li>${this.renderComplexItemContent(item)}</li>`;
        });
        
        html += '</ol>';
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
            return item;
        }
        
        let content = item.text || '';
        
        // 处理主要链接
        if (item.links) {
            item.links.forEach(link => {
                const linkHTML = `<a href="${link.url}"${link.target ? ` target="${link.target}"` : ''}>${link.text}</a>`;
                content = content.replace(link.text, linkHTML);
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
                content = content.replace(link.text, linkHTML);
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

    // 渲染模块
    renderModule(moduleId, moduleData) {
        const main = document.querySelector('main');
        if (!main) return;

        let sectionHTML = `<section id="${moduleId}">`;
        sectionHTML += `<h2>${moduleData.title}</h2>`;
        
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

    // 渲染页脚
    renderFooter(footer) {
        const footerElement = document.querySelector('footer');
        if (!footerElement) return;

        footerElement.innerHTML = `
            <p>${footer.updateDate}<a href="${footer.updateLink}">更新</a></p>
            <p>${footer.createDate}</p>
            <p><a href="${footer.cssValidator.url}"><img style="border: 0; width: 88px; height: 31px" src="${footer.cssValidator.img}" alt="${footer.cssValidator.alt}" /></a></p>
        `;
    }

    // 渲染所有内容
    async renderAll() {
        // 加载主配置
        await this.loadConfig();
        if (!this.config) {
            console.error('无法加载主配置文件');
            return;
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
            this.renderModule(moduleId, moduleData);
        });
        
        // 渲染页脚
        this.renderFooter(this.config.footer);
        
        console.log('模块化内容渲染完成');
        console.log(`已加载 ${this.modules.size} 个模块`);
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
