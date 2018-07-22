/**
* Color Quote Block Tag
* @description Color Quote Block
* @example
*     <% colorquote [type] %>
*     content
*     <% endcolorquote %>
*/
hexo.extend.tag.register('colorquote', function (args, content) {
    var type =  args[0];
    var mdContent = hexo.render.renderSync({text: content, engine: 'markdown'});
    return '<blockquote class="colorquote ' + type + '">' + mdContent + '</blockquote>';
}, {ends: true});
