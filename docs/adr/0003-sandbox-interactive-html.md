# Isolate interactive HTML in sandboxed iframes

Interactive teaching pages are published as separate static resources and embedded with `sandbox="allow-scripts"` without same-origin permission. This preserves their educational behavior while preventing their scripts from reading or controlling the parent blog.
