"""
md_render.py — Markdown -> HTML for lesson content.

Uses the `markdown` package when installed (production image); otherwise falls
back to a small self-contained converter so the app and selftest still run in a
bare environment. Lesson content is authored by the trusted admin, so output is
not sanitized.
"""
import html
import re

try:
    import markdown as _markdown

    def render_markdown(text):
        if not text:
            return ""
        return _markdown.markdown(
            text,
            extensions=["fenced_code", "tables", "toc", "sane_lists", "nl2br"],
            output_format="html5",
        )

except Exception:  # pragma: no cover - fallback path

    _INLINE = [
        (re.compile(r"\*\*(.+?)\*\*"), r"<strong>\1</strong>"),
        (re.compile(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)"), r"<em>\1</em>"),
        (re.compile(r"`([^`]+)`"), lambda m: "<code>%s</code>" % html.escape(m.group(1))),
        (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<a href="\2">\1</a>'),
    ]

    def _inline(s):
        s = html.escape(s, quote=False)
        for pat, rep in _INLINE:
            s = pat.sub(rep, s)
        return s

    def render_markdown(text):
        if not text:
            return ""
        lines = text.replace("\r\n", "\n").split("\n")
        out, i, n = [], 0, len(lines)
        list_stack = []  # 'ul' | 'ol'

        def close_lists(to=0):
            while len(list_stack) > to:
                out.append("</%s>" % list_stack.pop())

        while i < n:
            line = lines[i]

            # fenced code
            m = re.match(r"^```(\w*)\s*$", line)
            if m:
                close_lists()
                lang = m.group(1)
                buf = []
                i += 1
                while i < n and not re.match(r"^```\s*$", lines[i]):
                    buf.append(lines[i])
                    i += 1
                i += 1
                cls = ' class="language-%s"' % lang if lang else ""
                out.append("<pre><code%s>%s</code></pre>" % (cls, html.escape("\n".join(buf))))
                continue

            if not line.strip():
                close_lists()
                i += 1
                continue

            m = re.match(r"^(#{1,6})\s+(.*)$", line)
            if m:
                close_lists()
                lvl = len(m.group(1))
                out.append("<h%d>%s</h%d>" % (lvl, _inline(m.group(2).strip()), lvl))
                i += 1
                continue

            if re.match(r"^\s*([-*_])\s*\1\s*\1[\s\1]*$", line):
                close_lists()
                out.append("<hr>")
                i += 1
                continue

            if line.startswith(">"):
                close_lists()
                buf = []
                while i < n and lines[i].startswith(">"):
                    buf.append(lines[i][1:].lstrip())
                    i += 1
                out.append("<blockquote>%s</blockquote>" % _inline(" ".join(buf)))
                continue

            m = re.match(r"^(\s*)([-*+]|\d+\.)\s+(.*)$", line)
            if m:
                ordered = bool(re.match(r"\d+\.", m.group(2)))
                tag = "ol" if ordered else "ul"
                if not list_stack or list_stack[-1] != tag:
                    close_lists()
                    out.append("<%s>" % tag)
                    list_stack.append(tag)
                out.append("<li>%s</li>" % _inline(m.group(3).strip()))
                i += 1
                continue

            # table (very small: header | --- | rows)
            if "|" in line and i + 1 < n and re.match(r"^\s*\|?[\s:|-]+\|?\s*$", lines[i + 1]):
                close_lists()

                def cells(row):
                    return [c.strip() for c in row.strip().strip("|").split("|")]

                head = cells(line)
                i += 2
                rows = []
                while i < n and "|" in lines[i] and lines[i].strip():
                    rows.append(cells(lines[i]))
                    i += 1
                thead = "".join("<th>%s</th>" % _inline(c) for c in head)
                body = "".join(
                    "<tr>%s</tr>" % "".join("<td>%s</td>" % _inline(c) for c in r) for r in rows
                )
                out.append("<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>" % (thead, body))
                continue

            # paragraph
            close_lists()
            buf = [line]
            i += 1
            while i < n and lines[i].strip() and not re.match(
                r"^(#{1,6}\s|```|>|\s*([-*+]|\d+\.)\s)", lines[i]
            ):
                buf.append(lines[i])
                i += 1
            out.append("<p>%s</p>" % _inline(" ".join(s.strip() for s in buf)))

        close_lists()
        return "\n".join(out)
