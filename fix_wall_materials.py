import re

with open('src/components/3d/Wall.tsx', 'r') as file:
    content = file.read()

def replace_wall_material(match):
    full_match = match.group(0)
    if 'map=' in full_match:
        return full_match
        
    color_match = re.search(r'color=\{([^}]+)\}', full_match)
    if not color_match:
        return full_match
        
    color_val = color_match.group(1)
    
    # We want: color={isStudio && plasterTexture ? '#ffffff' : activeColor} map={isStudio ? plasterTexture : undefined}
    
    new_color = f"color={{isStudio && plasterTexture ? '#ffffff' : {color_val}}}"
    new_map = "map={isStudio ? plasterTexture : undefined}"
    
    new_match = full_match.replace(f'color={{{color_val}}}', f'{new_color} {new_map}')
    return new_match

new_content = re.sub(r'<meshStandardMaterial[^>]+/>', replace_wall_material, content)

with open('src/components/3d/Wall.tsx', 'w') as file:
    file.write(new_content)

print("Updated Wall.tsx")

