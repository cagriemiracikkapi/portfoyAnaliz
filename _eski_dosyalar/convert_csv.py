import codecs

try:
    with codecs.open('web_app/data/merged_katilim.csv', 'r', 'windows-1254') as f:
        content = f.read()
except:
    with codecs.open('web_app/data/merged_katilim.csv', 'r', 'utf-8') as f:
        content = f.read()

content = content.replace('`', '\\`')
js_content = 'const csvRawData = `\\n' + content + '\\n`;\\n'

with codecs.open('web_app/data/merged_katilim.js', 'w', 'utf-8-sig') as f:
    f.write(js_content)
