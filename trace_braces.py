with open('src/printstore/lab/LabArtworkReviewDetails.jsx', 'r') as f:
    lines = f.read().split('\n')

brace_stack = []
for i, line in enumerate(lines):
    line_num = i + 1
    j = 0
    # simple character scan, ignoring strings/comments
    in_string = False
    string_char = None
    in_comment = False
    in_line_comment = False
    
    while j < len(line):
        char = line[j]
        if in_line_comment:
            j += 1
            continue
        if in_comment:
            if char == '*' and j + 1 < len(line) and line[j+1] == '/':
                in_comment = False
                j += 2
            else:
                j += 1
            continue
        if in_string:
            if char == '\\':
                j += 2
            elif char == string_char:
                in_string = False
                j += 1
            else:
                j += 1
            continue
        if char == '/' and j + 1 < len(line) and line[j+1] == '/':
            in_line_comment = True
            j += 2
            continue
        if char == '/' and j + 1 < len(line) and line[j+1] == '*':
            in_comment = True
            j += 2
            continue
        if char in ("'", '"', '`'):
            in_string = True
            string_char = char
            j += 1
            continue
            
        if char == '{':
            brace_stack.append(line_num)
            if line_num > 1950:
                print(f"Push {{ at line {line_num}, stack: {brace_stack}")
        elif char == '}':
            if brace_stack:
                popped = brace_stack.pop()
                if line_num > 1950:
                    print(f"Pop }} at line {line_num} (closed {popped}), stack: {brace_stack}")
            else:
                print(f"Extra }} at line {line_num}")
        j += 1
    in_line_comment = False

print("Final brace stack:", brace_stack)
