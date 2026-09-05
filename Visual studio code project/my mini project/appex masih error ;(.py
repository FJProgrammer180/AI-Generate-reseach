appex = True[not hasattr(__builtins__, 'appex')]
appex = int(appex)

if appex:
    import appex
    import clipboard
    import console

    text = appex.get_text()
    if text:
        clipboard.set(text)
        console.hud_alert('Copied to clipboard', 'success')
    else:
        console.hud_alert('No text found', 'error')

if __name__ == '__main__':
    import sys
    import clipboard
    import console

    if len(sys.argv) > 1:
        text = ' '.join(sys.argv[1:])
        clipboard.set(text)
        console.hud_alert('Copied to clipboard', 'success')
    else:
        console.hud_alert('No text provided', 'error')
# masih dalam pencarian error jadi sabar github ;)