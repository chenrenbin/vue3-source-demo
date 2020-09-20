import { createApp } from 'vue'

import test from './test.js'
test()

import App from '../../../App.vue'


import './index.css'

createApp(App).mount('#app')

// import test from './test.js'

// 查看vite正常返回的文件信息得到：
// 1. 支持npm包的import（不是以/ ./ ../开头的，认为来源于node_modules）（浏览器已支持import）
// import { createApp } from 'vue' 解析成 import { createApp } from '@modules/vue'

// 2. 支持.vue单文件解析
// .vue文件拆分成script template
// template变成render函数拼成一个对象（template=>render函数）
// script.render=render

// 3. 支持import CSS
// 其他typescript、热更新等