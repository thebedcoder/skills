import re, sys
try:
    s = open(sys.argv[1]).read()
    m = re.match(r'---\n(.*?)\n---\n', s, re.S)
    if not m:
        sys.exit(0)
    fm = m.group(1)
    d = re.search(r'^description:[ \t]*(?:[>|][-+]?)?[ \t]*\n((?:[ \t]+\S.*\n?)+)', fm, re.M)
    if d:
        text = ' '.join(l.strip() for l in d.group(1).splitlines())
    else:
        d = re.search(r'^description:[ \t]*(\S.*)$', fm, re.M)
        if not d:
            sys.exit(0)
        text = d.group(1)
    print(len(text.strip()))
except Exception:
    pass
