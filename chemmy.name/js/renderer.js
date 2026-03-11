// 内容渲染引擎
class ContentRenderer {
    constructor() {
        this.content = null;
    }

    // 加载内容配置
    async loadContent() {
        try {
            const response = await fetch('data/content.json');
            this.content = await response.json();
            return this.content;
        } catch (error) {
            console.error('加载内容配置失败:', error);
            return null;
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

    // 渲染导航菜单
    renderNavigation(navigation, englishLink) {
        const nav = document.querySelector('nav ul');
        if (!nav) return;

        let navHTML = '';
        navigation.forEach(item => {
            navHTML += `<li><a href="${item.href}">${item.title}</a></li>`;
        });
        
        // 添加英文链接
        navHTML += `<li><a href="${englishLink.url}" class="english-link">${englishLink.text}</a></li>`;

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

    // 渲染section
    renderSection(sectionId, sectionData) {
        const main = document.querySelector('main');
        if (!main) return;

        let sectionHTML = `<section id="${sectionId}">`;
        sectionHTML += `<h2>${sectionData.title}</h2>`;
        
        sectionData.content.forEach(item => {
            sectionHTML += this.renderContentItem(item);
        });
        
        // 处理section底部的链接（如论文页面的Google Scholar链接）
        if (sectionData.footerLink) {
            sectionHTML += `<a href="${sectionData.footerLink.url}">${sectionData.footerLink.text}</a>`;
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
        if (!this.content) {
            await this.loadContent();
        }
        
        if (!this.content) {
            console.error('无法加载内容配置');
            return;
        }

        // 渲染各个部分
        this.renderProfile(this.content.profile);
        this.renderNavigation(this.content.navigation, this.content.englishLink);
        
        // 清空main内容
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = '';
        }
        
        // 渲染所有section
        Object.keys(this.content.sections).forEach(sectionId => {
            this.renderSection(sectionId, this.content.sections[sectionId]);
        });
        
        // 渲染页脚
        this.renderFooter(this.content.footer);
        
        console.log('内容渲染完成');
    }
}

// 初始化渲染器
document.addEventListener('DOMContentLoaded', async () => {
    const renderer = new ContentRenderer();
    await renderer.renderAll();
});
