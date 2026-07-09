import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all ${...} patterns and wrap with escapeHtml if not already wrapped
    # Pattern looks for ${var.field} or ${var.field || "default"}
    # We want to ignore ${escapeHtml(...)}
    
    # This regex is tricky. It's safer to just look for common patterns.
    # E.g. ${nextEvent.title}, ${club.name}, ${event.title}, etc.
    
    # We will match ${var.field} or ${var.field || "text"} 
    # where var is [a-zA-Z]+ and field is title, name, description, tagline, location, tag, source.
    
    fields = ["title", "name", "description", "tagline", "location", "tag", "source", "reason", "collection", "status"]
    
    for field in fields:
        # Match pattern: ${var.field}
        # Negative lookbehind to ensure it's not preceded by escapeHtml(
        pattern = r"(?<!escapeHtml\()\$\{([a-zA-Z]+\." + field + r"(?:\s*\|\|\s*[\"'][^\"']*[\"'])?)\}"
        content = re.sub(pattern, r"${escapeHtml(\1)}", content)
        
    with open(filepath, 'w') as f:
        f.write(content)
        
    print("Done escaping UI")

process_file("./js/ui.js")
