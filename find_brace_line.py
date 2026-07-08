import sys

with open('src/printstore/lab/LabArtworkReviewDetails.jsx', 'r') as f:
    content = f.read()

brace_stack = []
paren_stack = []
bracket_stack = []

in_string = False
string_char = None
in_comment = False
in_line_comment = False

lines = content.split('\n')
for i, line in enumerate(lines):
    line_num = i + 1
    j = 0
    while j < len(line):
        char = line[j]
        
        # Handle line comments
        if in_line_comment:
            j += 1
            continue
            
        # Handle block comments
        if in_comment:
            if char == '*' and j + 1 < len(line) and line[j+1] == '/':
                in_comment = False
                j += 2
            else:
                j += 1
            continue
            
        # Handle strings
        if in_string:
            if char == '\\':
                j += 2
            elif char == string_char:
                in_string = False
                j += 1
            else:
                j += 1
            continue
            
        # Detect comments
        if char == '/' and j + 1 < len(line) and line[j+1] == '/':
            in_line_comment = True
            j += 2
            continue
        if char == '/' and j + 1 < len(line) and line[j+1] == '*':
            in_comment = True
            j += 2
            continue
            
        # Detect strings
        if char in ("'", '"', '`'):
            in_string = True
            string_char = char
            j += 1
            continue
            
        # Braces
        if char == '{':
            brace_stack.append(line_num)
        elif char == '}':
            if brace_stack:
                brace_stack.pop()
            else:
                print(f"Extra '}}' at line {line_num}")
                
        # Parentheses
        if char == '(':
            paren_stack.append(line_num)
        elif char == ')':
            if paren_stack:
                paren_stack.pop()
            else:
                print(f"Extra ')' at line {line_num}")
                
        # Brackets
        if char == '[':
            bracket_stack.append(line_num)
        elif char == ']':
            if bracket_stack:
                bracket_stack.pop()
            else:
                print(f"Extra ']' at line {line_num}")
                
        j += 1
    in_line_comment = False

print("Unclosed braces opened at lines:", brace_stack)
print("Unclosed parentheses opened at lines:", paren_stack)
print("Unclosed brackets opened at lines:", bracket_stack)
