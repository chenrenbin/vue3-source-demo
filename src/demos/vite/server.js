const fs = require('fs')
const path = require('path')
const Koa = require('koa')
const { compile } = require('vue')
const compilerSfc = require('@vue/compiler-sfc')
const compilerDom = require('@vue/compiler-dom')

const app = new Koa()

function rewriteImport (content) {
    // 改造js文件内容，不是以/ ./ ../开头的import,替换成@modules开头
    return content.replace(/ from ['|"]([^'"]+)['|"]/g, function(s0, s1) {
        if(s1[0] !== '.' && s1[1] !== '/') {
            return `from "/@modules/${s1}"`
        } else {
            return s0
        }
    })
}

app.use(context => {
    const { request: {url, query} } = context
    if (url === '/') {
        let content = fs.readFileSync('./index.html', 'utf-8')
        content = content.replace('<script', `
            <script>
                // 注入socket客户端可实现热更新
                window.process = {
                    env: {NODE_EV: 'dev'}
                }
            </script>
            <script

        `)
        context.type = 'text/html'
        context.body = content
    } else if (url.endsWith('.js')) {
        const address = path.resolve(__dirname, url.slice(1))
        context.type = 'application/javascript'
        const content = fs.readFileSync(address, 'utf-8')
        context.body = rewriteImport(content)
    } else if (url.startsWith('/@modules/')) {
        // package.json文件的module用于import，main用于CommonJs的require
        let prefix = path.resolve(__dirname, 'node_modules', url.replace('/@modules/', ''))
        prefix =prefix.replace('/src/demos/vite', '')
        const module = require(prefix + '/package.json').module
        const address = path.resolve(prefix, module)
        const content = fs.readFileSync(address, 'utf-8')
        context.type = 'application/javascript'
        context.body = rewriteImport(content)
    } else if (url.indexOf('.vue') > -1 ) {
        let address = path.resolve(__dirname, url.split('?')[0].slice(1))
        address = address.replace('/demos/vite', '')
        // 解析单文件---compiler-sfc
        const {descriptor} = compilerSfc.parse(fs.readFileSync(address, 'utf-8'))
        if (!query.type) {
            // javescript
            context.type = 'application/javascript'
            context.body = `
${rewriteImport(descriptor.script.content.replace('export default ', 'const __script = '))}
import {render as __render} from "${url}?type=template"
__script.render = __render
export default __script
            `
        } else if (query.type === 'template') {
            const template = descriptor.template
            const render = compilerDom.compile(template.content, {mode: 'module'}).code
            context.type = 'application/javascript'
            context.body = rewriteImport(render)
        }
    } else if (url.endsWith('.css')) {
        // 可尝试less sass 
        const address = path.resolve(__dirname, url.slice(1))
        const file = fs.readFileSync(address, 'utf-8')
        const content = `
            const css = "${file.replace(/\n/g, '')}"
            const link = document.createElement('style')
            link.setAttribute('type', 'text/css')
            document.head.appendChild(link)
            link.innerHTML = css
            export default css
        `
        context.type = 'application/javascript'
        context.body = content
    }
})

app.listen(8090, () => {
    console.log(`listen at 8090`)
})