import os
import re
import glob

files = glob.glob('src/components/*CabinetTesting.tsx')

def replace_material(match):
    full_match = match.group(0)
    # Check if it already has map
    if 'map=' in full_match:
        return full_match
        
    # Extract color
    color_match = re.search(r'color=\{([^}]+)\}', full_match)
    if not color_match:
        color_match = re.search(r'color="([^"]+)"', full_match)
    
    if not color_match:
        return full_match
        
    color_val = color_match.group(1)
    
    # Don't replace metal or pure colors like #333333
    if 'metalness={0.8}' in full_match or 'metalness={0.9}' in full_match or 'metalness={1}' in full_match or color_val.startswith('#'):
        return full_match

    is_door = 'doorColor' in color_val or 'drawerFront' in color_val
    
    # We want to replace color={...} with color={settings.isStudio && settings.woodTexture ? '#ffffff' : ...} map={settings.isStudio ? settings.woodTexture : undefined}
    
    new_color = f"color={{settings.isStudio && settings.woodTexture ? '#ffffff' : {color_val}}}"
    new_map = "map={settings.isStudio ? settings.woodTexture : undefined}"
    
    new_match = full_match.replace(f'color={{{color_val}}}', f'{new_color} {new_map}')
    return new_match

for f in files:
    with open(f, 'r') as file:
        content = file.read()
        
    new_content = re.sub(r'<meshStandardMaterial[^>]+/>', replace_material, content)
    
    if new_content != content:
        with open(f, 'w') as file:
            file.write(new_content)
        print(f"Updated {f}")

