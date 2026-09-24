VoyageCare 官网 - 静态网页包
================================

【怎么看这个网页】
方式一（最简单）：解压后双击 index.html，浏览器直接打开。
方式二（推荐，动效最完整）：解压后在文件夹里打开终端（CMD/PowerShell），运行：
    python -m http.server 8080
然后浏览器访问 http://localhost:8080

【在线版】
https://providence-f.github.io/voyagecare/

【文件说明】
index.html          首页
cost-explorer.html  价格计算器
journey.html        行程页
specialists.html    医生页
stories.html        用户故事
faq.html            常见问题
pre-assessment.html 免费预评估表单
assets/             样式与脚本
fonts/ images/      字体与图标资源

【说明】
- 纯静态网站，无需安装任何东西，双击即可用
- 页面上的医生、用户故事为概念期示例数据（页面已标注 Sample），上线前需替换
- 表单提交目前打印在浏览器控制台，上线时接入 Formspree 或 CRM
