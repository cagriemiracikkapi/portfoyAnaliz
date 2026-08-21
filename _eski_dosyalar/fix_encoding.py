import codecs
import os

def rewrite_utf8(path):
    try:
        with codecs.open(path, 'r', 'windows-1254') as f:
            content = f.read()
    except Exception as e:
        print(f"Failed to read {path}: {e}")
        return
        
    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(content)
    print(f"Rewrote {path} with UTF-8")

rewrite_utf8('web_app/index.html')
rewrite_utf8('web_app/app.js')
rewrite_utf8('web_app/style.css')
