require 'sketchup'
require 'csv' # For CSV export

module CBXHandleSysSettings
  # =====================================================================
  # GAP STANDARDS - STRICT ENFORCEMENT
  # =====================================================================

  # Door-to-door gap (between two doors in same cabinet)
  DOOR_TO_DOOR_GAP = 2.0.mm

  # Door to cabinet side/end panel gap
  DOOR_TO_PANEL_GAP = 2.0.mm

  # Drawer front to drawer front gap
  DRAWER_TO_DRAWER_GAP = 2.0.mm

  # =====================================================================
  # PLACEHOLDER SYSTEM - SPAWN MANAGEMENT
  # =====================================================================

  # Color system for placeholders
  COLOR_RED = Sketchup::Color.new(255, 82, 82)      # Bottom cabinets
  COLOR_GREEN = Sketchup::Color.new(76, 175, 80)    # Top cabinets
  COLOR_BLUE = Sketchup::Color.new(33, 150, 243)    # Tall cabinets
  COLOR_YELLOW = Sketchup::Color.new(255, 235, 59)  # Walls
  COLOR_ORANGE = Sketchup::Color.new(255, 152, 0)   # Doors
  COLOR_CYAN = Sketchup::Color.new(0, 188, 212)     # Windows

  # Track next spawn position (auto-spacing)
  @next_spawn_x = 0.mm
  @next_spawn_y = 0.mm
  SPAWN_GAP = 100.mm

  def self.reset_spawn_position
    @next_spawn_x = 0.mm
    @next_spawn_y = 0.mm
  end

  def self.get_next_spawn_position(width, _depth)
    pos = [@next_spawn_x, @next_spawn_y, 0]
    @next_spawn_x += width + SPAWN_GAP
    pos
  end

  # =====================================================================
  # PLACEHOLDER CREATION
  # =====================================================================

  def self.create_placeholder(type, auto_spawn = true)
    model = Sketchup.active_model

    # Default dimensions based on type
    # COLORED VOLUMES - Face shows orientation, volume shows sizing
    # CORRECT Z ELEVATIONS: Bottom=0-900, Top=1500-2100, Tall=0-2100
    defaults = case type
               when 'bottom'
                 { width: 600.mm, depth: 600.mm, height: 900.mm, elevation: 0.mm, color: COLOR_RED, name: 'Bottom Cabinet Placeholder' }
               when 'top'
                 { width: 600.mm, depth: 350.mm, height: 600.mm, elevation: 1500.mm, color: COLOR_GREEN, name: 'Top Cabinet Placeholder' }
               when 'tall'
                 { width: 600.mm, depth: 600.mm, height: 2100.mm, elevation: 0.mm, color: COLOR_BLUE, name: 'Tall Cabinet Placeholder' }
               when 'door_cutout'
                 { width: 900.mm, depth: 18.mm, height: 2100.mm, elevation: 0.mm, color: COLOR_ORANGE, name: 'Door Cutout' }
               when 'window_cutout'
                 { width: 1200.mm, depth: 18.mm, height: 1200.mm, elevation: 1000.mm, color: COLOR_CYAN, name: 'Window Cutout' }
               else
                 { width: 600.mm, depth: 600.mm, height: 900.mm, elevation: 0.mm, color: COLOR_RED, name: 'Placeholder' }
               end

    # Prompt for dimensions (width, depth, height)
    prompts = ['Width (mm):', 'Depth (mm):', 'Height (mm):']
    values = [defaults[:width].to_mm, defaults[:depth].to_mm, defaults[:height].to_mm]
    results = UI.inputbox(prompts, values, "Create #{defaults[:name]}")

    return unless results

    width = parse_mm(results[0])
    depth = parse_mm(results[1])
    height = parse_mm(results[2])

    model.start_operation("Create #{defaults[:name]}", true)

    entities = model.active_entities
    group = entities.add_group
    group.name = defaults[:name]

    # Get spawn position (origin + spacing) - only X axis
    x_offset = if auto_spawn
                 pos = get_next_spawn_position(width, depth)
                 pos[0]
               else
                 0
               end

    # Get correct Z elevation
    z_elevation = defaults[:elevation]

    # Create colored volume (full 3D box for sizing reference)
    # Front face at Y=0 (facing forward)
    pts = [
      [0, 0, 0],
      [width, 0, 0],
      [width, -depth, 0],  # Negative Y = extends backward
      [0, -depth, 0]
    ]

    face = group.entities.add_face(pts)
    face.pushpull(height)

    # Apply color (semi-transparent)
    group.material = defaults[:color]
    group.material.alpha = 0.6

    # Move to correct position: X (spawn position) + Z (elevation)
    group.transform!(Geom::Transformation.new([x_offset, 0, z_elevation]))

    # Add attributes for shotgun menu injection
    group.set_attribute('CBX', 'type', type)
    group.set_attribute('CBX', 'width', width.to_mm)
    group.set_attribute('CBX', 'depth', depth.to_mm)
    group.set_attribute('CBX', 'height', height.to_mm)
    group.set_attribute('CBX', 'elevation', z_elevation.to_mm)

    model.commit_operation

    # Updated message with workflow
    elev_text = z_elevation > 0 ? " at #{z_elevation.to_mm.round}mm elevation" : " at ground level"
    UI.messagebox("✓ #{defaults[:name]} created!\n\nWidth: #{width.to_mm.round}mm\nDepth: #{depth.to_mm.round}mm\nHeight: #{height.to_mm.round}mm\nPosition: X=#{x_offset.to_mm.round}mm#{elev_text}\n\n👉 SELECT placeholder → Click Shotgun button\n👉 Dimensions will auto-fill in dialog!\n👉 Placeholder stays as reference marker")
  end

  # =====================================================================
  # WALL ROOM CREATION SYSTEM
  # =====================================================================

  def self.create_wall_room
    model = Sketchup.active_model

    # Dialog for wall lengths
    prompts = ['Wall A Length (mm):', 'Wall B Length (mm):', 'Wall C Length (mm):', 'Wall D Length (mm):',
               'Wall Height (mm):']
    defaults = %w[3000 3000 3000 3000 2400]
    results = UI.inputbox(prompts, defaults, 'Create Room Walls')

    return unless results

    wall_a = parse_mm(results[0])
    wall_b = parse_mm(results[1])
    wall_c = parse_mm(results[2])
    wall_d = parse_mm(results[3])
    wall_height = parse_mm(results[4])

    wall_thickness = 18.mm

    model.start_operation('Create Wall Room', true)

    entities = model.active_entities

    # Create 4 walls perpendicular to each other
    # Wall A: Along X-axis (front)
    if wall_a > 0
      wall_a_grp = entities.add_group
      wall_a_grp.name = 'Wall A'
      face_a = wall_a_grp.entities.add_face([0, 0, 0], [wall_a, 0, 0], [wall_a, 0, wall_height], [0, 0, wall_height])
      face_a.pushpull(-wall_thickness)
      wall_a_grp.material = COLOR_YELLOW
      wall_a_grp.material.alpha = 0.3
      wall_a_grp.set_attribute('CBX', 'type', 'wall')
    end

    # Wall B: Perpendicular to A, along Y-axis (right side)
    if wall_b > 0
      wall_b_grp = entities.add_group
      wall_b_grp.name = 'Wall B'
      face_b = wall_b_grp.entities.add_face([wall_a, 0, 0], [wall_a, wall_b, 0], [wall_a, wall_b, wall_height],
                                            [wall_a, 0, wall_height])
      face_b.pushpull(-wall_thickness)
      wall_b_grp.material = COLOR_YELLOW
      wall_b_grp.material.alpha = 0.3
      wall_b_grp.set_attribute('CBX', 'type', 'wall')
    end

    # Wall C: Opposite to A (back)
    if wall_c > 0
      wall_c_grp = entities.add_group
      wall_c_grp.name = 'Wall C'
      face_c = wall_c_grp.entities.add_face([wall_a, wall_b, 0], [0, wall_b, 0], [0, wall_b, wall_height],
                                            [wall_a, wall_b, wall_height])
      face_c.pushpull(wall_thickness)
      wall_c_grp.material = COLOR_YELLOW
      wall_c_grp.material.alpha = 0.3
      wall_c_grp.set_attribute('CBX', 'type', 'wall')
    end

    # Wall D: Opposite to B (left side)
    if wall_d > 0
      wall_d_grp = entities.add_group
      wall_d_grp.name = 'Wall D'
      face_d = wall_d_grp.entities.add_face([0, wall_b, 0], [0, 0, 0], [0, 0, wall_height], [0, wall_b, wall_height])
      face_d.pushpull(wall_thickness)
      wall_d_grp.material = COLOR_YELLOW
      wall_d_grp.material.alpha = 0.3
      wall_d_grp.set_attribute('CBX', 'type', 'wall')
    end

    model.commit_operation

    UI.messagebox("✓ Room walls created!\n\nWall A: #{wall_a.to_mm.round}mm\nWall B: #{wall_b.to_mm.round}mm\nWall C: #{wall_c.to_mm.round}mm\nWall D: #{wall_d.to_mm.round}mm\nHeight: #{wall_height.to_mm.round}mm\n\nNow add door/window cutouts from toolbar!")
  end

  # =====================================================================
  # SHOTGUN MENU FOR SELECTED PLACEHOLDER
  # =====================================================================

  def self.show_shotgun_menu_for_selection
    model = Sketchup.active_model
    selection = model.selection

    if selection.empty?
      UI.messagebox("⚠️ No placeholder selected!\n\nPlease:\n1. Select a colored placeholder box (RED/GREEN/BLUE)\n2. Click this button again\n3. Choose cabinet type from menu")
      return
    end

    entity = selection.first

    unless entity.is_a?(Sketchup::Group)
      UI.messagebox("⚠️ Please select a placeholder box!\n\nSelected entity is not a group.")
      return
    end

    cbx_type = entity.get_attribute('CBX', 'type')

    unless cbx_type
      UI.messagebox("⚠️ This is not a CBX placeholder!\n\nPlease select a colored placeholder created from the toolbar.")
      return
    end

    # Get placeholder dimensions
    width = entity.get_attribute('CBX', 'width')
    depth = entity.get_attribute('CBX', 'depth')
    height = entity.get_attribute('CBX', 'height')

    # Show menu based on type
    case cbx_type
    when 'bottom'
      options = ['2-Drawer Unit', '3-Drawer Unit', 'Two-Door Unit', 'Sink Unit', 'Cooker Unit', 'Bottom Corner']
      result = UI.inputbox(['Select Cabinet Type:'], [options.join('|')], 'Bottom Cabinet Options')

      if result
        selected = result[0]
        UI.messagebox("✓ You selected: #{selected}\n\nDimensions: #{width}×#{depth}×#{height}mm\n\n🔧 This will trigger the main Shotgun dialog with these settings pre-filled.\n\nUse 'Extensions → CBX Cabinet System' to generate the cabinet.")
        # Here you would call show_html_dialog with pre-filled values
        show_html_dialog
      end

    when 'top'
      options = ['Standard Cabinet', 'Open Rack (2 Shelves)', 'Hood Unit', 'Top Corner']
      result = UI.inputbox(['Select Cabinet Type:'], [options.join('|')], 'Top Cabinet Options')

      if result
        selected = result[0]
        UI.messagebox("✓ You selected: #{selected}\n\nDimensions: #{width}×#{depth}×#{height}mm\n\n🔧 Opening Shotgun dialog...")
        show_html_dialog
      end

    when 'tall'
      UI.messagebox("✓ Tall Cabinet\n\nDimensions: #{width}×#{depth}×#{height}mm\n\n🔧 Opening Shotgun dialog...")
      show_html_dialog

    else
      UI.messagebox("Unknown placeholder type: #{cbx_type}")
    end
  end

  # ----------------------------------------------------------------------
  #   1. HELPER METHOD TO PARSE ALL UI INPUTS AS MILLIMETERS
  # ----------------------------------------------------------------------
  def self.parse_mm(value)
    # Return 0 mm for nil/empty inputs
    return 0.mm if value.nil?

    # If numeric, treat as millimetres
    return value.mm if value.is_a?(Numeric)

    s = value.to_s.strip
    return 0.mm if s.empty?

    # Remove any non-numeric characters (e.g., mm) and parse
    num = s.gsub(/[^ -]/, '') # normalize
    num = num.gsub(/[a-zA-Z]/, '')
    n = num.to_f
    n.mm
  end

  # ----------------------------------------------------------------------
  #                      COOKER HOOD SIDE PANELS
  # ----------------------------------------------------------------------
  def self.create_cooker_hood_side_panels(entities, x_offset, params)
    elevation         = params[:elevation]
    panel_height      = params[:height]
    interior_depth    = params[:interior_depth]
    door_thickness    = 18.mm
    panel_thickness   = 18.mm

    # Panel extends forward from wall by depth + door + 3mm
    panel_forward_offset = door_thickness + 3.mm
    panel_depth = interior_depth + door_thickness + 3.mm

    # Left panel - positioned to left of hood, extending forward
    left_panel_grp = entities.add_group
    left_panel_grp.name = 'Cooker Hood Left Panel'
    left_face = left_panel_grp.entities.add_face(
      [0, 0, 0],
      [0, -panel_depth, 0],
      [0, -panel_depth, panel_height],
      [0, 0, panel_height]
    )
    left_face.reverse! if left_face.normal.z < 0
    left_face.pushpull(-panel_thickness)
    left_panel_grp.material = 'Wood_Cherry'
    left_panel_grp.transformation = Geom::Transformation.new(
      [x_offset - panel_thickness, -panel_forward_offset, elevation]
    )

    # Right panel - positioned to right of hood, extending forward
    right_panel_grp = entities.add_group
    right_panel_grp.name = 'Cooker Hood Right Panel'
    right_face = right_panel_grp.entities.add_face(
      [0, 0, 0],
      [0, -panel_depth, 0],
      [0, -panel_depth, panel_height],
      [0, 0, panel_height]
    )
    right_face.reverse! if right_face.normal.z < 0
    right_face.pushpull(-panel_thickness)
    right_panel_grp.material = 'Wood_Cherry'
    right_panel_grp.transformation = Geom::Transformation.new(
      [x_offset + params[:width], -panel_forward_offset, elevation]
    )
  end

  # ----------------------------------------------------------------------
  #                      TOP CABINET HELPERS (copied from CBX_V6)
  # ----------------------------------------------------------------------
  def self.create_top_cabinet_at_offset(entities, origin_x, params)
    elevation     = params[:elevation] || 1500.mm
    door_system   = params[:door_system] || 'handled'
    door_override = door_system == 'gola' ? (params[:door_override] || 20.mm) : 0.mm
    cab_index     = params[:cab_index] || 999
    project_name  = params[:project_name] || ''
    params[:door_side_clearance] || 3.mm

    prefix = project_name.empty? ? '' : "#{project_name} - "

    # UI height remains as provided (in mm)
    ui_height = params[:height]

    cab_width     = params[:width]
    cab_depth     = params[:depth]
    mat_thickness = params[:mat_thickness]
    back_thickness = params[:back_thickness]
    groove_depth = params[:groove_depth]
    door_outer_gap = params[:door_out_gap]
    door_inner_gap = params[:door_in_gap]
    door_mat_thk  = params[:door_mat_thk]
    open_rack     = params[:open_rack]
    # Force open rack shelf count to 2 when open rack is true
    open_rack_shelf_count = open_rack ? 2 : 0

    final_depth = open_rack ? (cab_depth + 22.mm) : cab_depth

    grp = entities.add_group
    grp.transformation = Geom::Transformation.new([origin_x, -final_depth, elevation])
    grp.name = "#{prefix}Top Cabinet #{cab_index}"

    if open_rack
      effective_cab_height = ui_height
      depth = cab_depth + 22.mm # Keep the extra depth for open rack

      # For open rack, use door material thickness for all components
      left_grp = grp.entities.add_group
      f_left = left_grp.entities.add_face([0, 0, 0],
                                          [0, depth, 0],
                                          [0, depth, effective_cab_height],
                                          [0, 0, effective_cab_height])
      f_left.pushpull(door_mat_thk)
      left_grp.name = "#{prefix}Top Cabinet #{cab_index} - Left Side"

      right_grp = grp.entities.add_group
      f_right = right_grp.entities.add_face([cab_width, 0, 0],
                                            [cab_width, depth, 0],
                                            [cab_width, depth, effective_cab_height],
                                            [cab_width, 0, effective_cab_height])
      f_right.pushpull(-door_mat_thk)
      right_grp.name = "#{prefix}Top Cabinet #{cab_index} - Right Side"

      top_grp = grp.entities.add_group
      f_top = top_grp.entities.add_face([door_mat_thk, 0, effective_cab_height - door_mat_thk],
                                        [cab_width - door_mat_thk, 0, effective_cab_height - door_mat_thk],
                                        [cab_width - door_mat_thk, depth, effective_cab_height - door_mat_thk],
                                        [door_mat_thk, depth, effective_cab_height - door_mat_thk])
      f_top.pushpull(door_mat_thk)
      top_grp.name = "#{prefix}Top Cabinet #{cab_index} - Top Panel"

      bottom_grp = grp.entities.add_group
      f_bottom = bottom_grp.entities.add_face([door_mat_thk, 0, door_mat_thk],
                                              [cab_width - door_mat_thk, 0, door_mat_thk],
                                              [cab_width - door_mat_thk, depth, door_mat_thk],
                                              [door_mat_thk, depth, door_mat_thk])
      f_bottom.pushpull(-door_mat_thk)
      bottom_grp.name = "#{prefix}Top Cabinet #{cab_index} - Bottom Panel"

      # Back panel flush with cabinet for open rack
      back_grp = grp.entities.add_group
      f_back = back_grp.entities.add_face([door_mat_thk, depth - door_mat_thk, door_mat_thk],
                                          [cab_width - door_mat_thk, depth - door_mat_thk, door_mat_thk],
                                          [cab_width - door_mat_thk, depth - door_mat_thk,
                                           effective_cab_height - door_mat_thk],
                                          [door_mat_thk, depth - door_mat_thk, effective_cab_height - door_mat_thk])
      f_back.pushpull(-door_mat_thk)
      back_grp.name = "#{prefix}Top Cabinet #{cab_index} - Back (open rack)"

      if open_rack_shelf_count > 0
        avail_h = effective_cab_height - 2 * door_mat_thk
        step = avail_h / (open_rack_shelf_count + 1)
        open_rack_shelf_count.times do |i|
          shelf_z = door_mat_thk + (step * (i + 1))
          shelf_d = depth - 2 * door_mat_thk
          s_grp = grp.entities.add_group
          fs = s_grp.entities.add_face([door_mat_thk, 0, shelf_z],
                                       [cab_width - door_mat_thk, 0, shelf_z],
                                       [cab_width - door_mat_thk, shelf_d, shelf_z],
                                       [door_mat_thk, shelf_d, shelf_z])
          fs.pushpull(-door_mat_thk)
          s_grp.name = "#{prefix}Top Cabinet #{cab_index} - Open Rack Shelf #{i + 1}"
        end
      end
    else
      effective_cab_height = ui_height - door_override
      carcass_offset = door_override
      skip_groove = false
      depth = cab_depth

      # Build Carcass (Box) Geometry
      left_grp = grp.entities.add_group
      f_left = left_grp.entities.add_face([0, 0, carcass_offset],
                                          [0, depth, carcass_offset],
                                          [0, depth, carcass_offset + effective_cab_height],
                                          [0, 0, carcass_offset + effective_cab_height])
      f_left.pushpull(mat_thickness)
      left_grp.name = "#{prefix}Top Cabinet #{cab_index} - Left Side"

      right_grp = grp.entities.add_group
      f_right = right_grp.entities.add_face([cab_width, 0, carcass_offset],
                                            [cab_width, depth, carcass_offset],
                                            [cab_width, depth, carcass_offset + effective_cab_height],
                                            [cab_width, 0, carcass_offset + effective_cab_height])
      f_right.pushpull(-mat_thickness)
      right_grp.name = "#{prefix}Top Cabinet #{cab_index} - Right Side"

      top_grp = grp.entities.add_group
      f_top = top_grp.entities.add_face([mat_thickness, 0, carcass_offset + effective_cab_height - mat_thickness],
                                        [cab_width - mat_thickness, 0,
                                         carcass_offset + effective_cab_height - mat_thickness],
                                        [cab_width - mat_thickness, depth,
                                         carcass_offset + effective_cab_height - mat_thickness],
                                        [mat_thickness, depth, carcass_offset + effective_cab_height - mat_thickness])
      f_top.pushpull(mat_thickness)
      top_grp.name = "#{prefix}Top Cabinet #{cab_index} - Top Panel"

      bottom_grp = grp.entities.add_group
      f_bottom = bottom_grp.entities.add_face([mat_thickness, 0, carcass_offset + mat_thickness],
                                              [cab_width - mat_thickness, 0, carcass_offset + mat_thickness],
                                              [cab_width - mat_thickness, depth, carcass_offset + mat_thickness],
                                              [mat_thickness, depth, carcass_offset + mat_thickness])
      f_bottom.pushpull(-mat_thickness)
      bottom_grp.name = "#{prefix}Top Cabinet #{cab_index} - Bottom Panel"

      if skip_groove
        back_grp = grp.entities.add_group
        f_back = back_grp.entities.add_face([door_mat_thk, depth - 2 * door_mat_thk, carcass_offset + door_mat_thk],
                                            [cab_width - door_mat_thk, depth - 2 * door_mat_thk,
                                             carcass_offset + door_mat_thk],
                                            [cab_width - door_mat_thk, depth - 2 * door_mat_thk,
                                             carcass_offset + effective_cab_height - door_mat_thk],
                                            [door_mat_thk, depth - 2 * door_mat_thk,
                                             carcass_offset + effective_cab_height - door_mat_thk])
        f_back.pushpull(-door_mat_thk)
        back_grp.name = "#{prefix}Top Cabinet #{cab_index} - Back (open rack)"
      else
        inner_w = cab_width - 2 * mat_thickness
        inner_h = effective_cab_height - 2 * mat_thickness
        bx = mat_thickness - groove_depth
        bz = mat_thickness - groove_depth
        bw = inner_w + 2 * groove_depth
        bh = inner_h + 2 * groove_depth
        back_grp = grp.entities.add_group
        f_back = back_grp.entities.add_face([bx, depth - (mat_thickness + back_thickness), bz + carcass_offset],
                                            [bx + bw, depth - (mat_thickness + back_thickness), bz + carcass_offset],
                                            [bx + bw, depth - (mat_thickness + back_thickness),
                                             bz + carcass_offset + bh],
                                            [bx, depth - (mat_thickness + back_thickness), bz + carcass_offset + bh])
        f_back.pushpull(-back_thickness)
        back_grp.name = "#{prefix}Top Cabinet #{cab_index} - Back (grooved)"

        # Back Stretchers for regular top cabinets (100mm tall Z-axis, carcase_thk deep Y-axis)
        # Position at wall (Y = depth) and pushpull FORWARD (positive direction) toward front
        stretcher_height = 100.mm
        stretcher_width = cab_width - 2 * mat_thickness # Between side panels
        stretcher_depth = mat_thickness # Carcase thickness depth
        stretcher_y = depth # At wall position

        # Bottom back stretcher (sits flush on bottom panel)
        bottom_stretcher_grp = grp.entities.add_group
        f_bs_bot = bottom_stretcher_grp.entities.add_face([mat_thickness, stretcher_y, carcass_offset + mat_thickness],
                                                          [mat_thickness + stretcher_width, stretcher_y,
                                                           carcass_offset + mat_thickness],
                                                          [mat_thickness + stretcher_width, stretcher_y,
                                                           carcass_offset + mat_thickness + stretcher_height],
                                                          [mat_thickness, stretcher_y,
                                                           carcass_offset + mat_thickness + stretcher_height])
        f_bs_bot.pushpull(stretcher_depth) # Positive = push forward toward front
        bottom_stretcher_grp.name = "#{prefix}Top Cabinet #{cab_index} - Bottom Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

        # Top back stretcher (positioned UNDER the top panel)
        top_stretcher_z = carcass_offset + effective_cab_height - mat_thickness - stretcher_height # Under top panel
        top_stretcher_grp = grp.entities.add_group
        f_bs_top = top_stretcher_grp.entities.add_face([mat_thickness, stretcher_y, top_stretcher_z],
                                                       [mat_thickness + stretcher_width, stretcher_y, top_stretcher_z],
                                                       [mat_thickness + stretcher_width, stretcher_y,
                                                        top_stretcher_z + stretcher_height],
                                                       [mat_thickness, stretcher_y,
                                                        top_stretcher_z + stretcher_height])
        f_bs_top.pushpull(stretcher_depth) # Positive = push forward toward front
        top_stretcher_grp.name = "#{prefix}Top Cabinet #{cab_index} - Top Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"
      end

      mid_z = carcass_offset + mat_thickness + ((effective_cab_height - 2 * mat_thickness) / 2.0)
      shelf_d = depth - back_thickness - mat_thickness
      shelf_grp = grp.entities.add_group
      f_shelf = shelf_grp.entities.add_face([mat_thickness, 0, mid_z],
                                            [cab_width - mat_thickness, 0, mid_z],
                                            [cab_width - mat_thickness, shelf_d, mid_z],
                                            [mat_thickness, shelf_d, mid_z])
      f_shelf.pushpull(-mat_thickness)
      shelf_grp.name = "#{prefix}Top Cabinet #{cab_index} - Mid Shelf"

      unless open_rack
        door_top = ui_height
        if cab_width < 599.5.mm
          door_grp = grp.entities.add_group
          dw = cab_width - 2 * door_outer_gap
          f_door = door_grp.entities.add_face([door_outer_gap, 0, 0],
                                              [door_outer_gap + dw, 0, 0],
                                              [door_outer_gap + dw, 0, door_top],
                                              [door_outer_gap, 0, door_top])
          f_door.pushpull(door_mat_thk)
          door_grp.name = "#{prefix}Top Cabinet #{cab_index} - Single Door"
        else
          door_opening = cab_width - 2 * door_outer_gap - door_inner_gap
          half_door = door_opening / 2.0

          left_door_grp = grp.entities.add_group
          f_ld = left_door_grp.entities.add_face([door_outer_gap, 0, 0],
                                                 [door_outer_gap + half_door, 0, 0],
                                                 [door_outer_gap + half_door, 0, door_top],
                                                 [door_outer_gap, 0, door_top])
          f_ld.pushpull(door_mat_thk)
          left_door_grp.name = "#{prefix}Top Cabinet #{cab_index} - Left Door"

          right_door_grp = grp.entities.add_group
          f_rd = right_door_grp.entities.add_face([door_outer_gap + half_door + door_inner_gap, 0, 0],
                                                  [door_outer_gap + 2 * half_door + door_inner_gap, 0, 0],
                                                  [door_outer_gap + 2 * half_door + door_inner_gap, 0, door_top],
                                                  [door_outer_gap + half_door + door_inner_gap, 0, door_top])
          f_rd.pushpull(door_mat_thk)
          right_door_grp.name = "#{prefix}Top Cabinet #{cab_index} - Right Door"
        end
      end

    end

    grp
  end

  # ----------------------------------------------------------------------
  #                      FILL / DOOR UNIT HELPERS (copied)
  # ----------------------------------------------------------------------
  def self.fill_leftover_units_for_top(remainder)
    return [[], 0.mm] if remainder.nil? || remainder <= 0

    standard_widths = [600.mm, 450.mm, 350.mm, 250.mm]
    chosen_units = []
    while remainder >= 150.mm
      picked = false
      standard_widths.each do |sw|
        next unless sw <= remainder

        chosen_units << sw
        remainder -= sw
        picked = true
        break
      end
      break unless picked
    end
    [chosen_units, remainder]
  end

  def self.fill_door_units_for_bottom(remainder)
    return [] if remainder.nil? || remainder <= 0

    door_units = []
    while remainder >= 250.mm
      if remainder >= 900.mm
        door_units << 900.mm
        remainder -= 900.mm
      elsif remainder >= 600.mm
        door_units << 600.mm
        remainder -= 600.mm
      elsif remainder >= 450.mm
        door_units << 450.mm
        remainder -= 450.mm
      elsif remainder >= 300.mm
        door_units << 300.mm
        remainder -= 300.mm
      elsif remainder >= 250.mm
        door_units << 250.mm
        remainder -= 250.mm
      end
    end
    door_units << -remainder if remainder > 0
    door_units
  end

  # ----------------------------------------------------------------------
  #           VERIFY CREATION AND RERUN MISSING MODULES (self-check)
  # ----------------------------------------------------------------------
  def self.verify_and_rerun_if_missing(top_params, bot_params, tall_params, max_attempts = 1)
    attempts = 0
    model = Sketchup.active_model
    loop do
      missing = { top: false, bottom: false, tall: false }
      top_expected = top_params && top_params[:wall_length] && top_params[:wall_length] > 0
      bottom_expected = bot_params && bot_params[:target_total_width] && bot_params[:target_total_width] > 0
      # FIX: Only expect tall if explicitly enabled AND has valid params
      tall_expected = tall_params && tall_params[:enabled] == true && tall_params[:total_height] && tall_params[:cabinet_width]

      groups = model.active_entities.grep(Sketchup::Group)
      top_count = groups.count { |g| g.name =~ /^Top Cabinet/ }
      bottom_count = groups.count { |g| g.name =~ /^Bottom Box/ }
      tall_count = groups.count { |g| g.name =~ /^Tall Unit/ }

      missing[:top] = top_expected && top_count == 0
      missing[:bottom] = bottom_expected && bottom_count == 0
      missing[:tall] = tall_expected && tall_count == 0

      break unless missing.values.any?

      attempts += 1
      break if attempts > max_attempts

      UI.messagebox("Verification: Missing modules detected (Top=#{missing[:top]}, Bottom=#{missing[:bottom]}, Tall=#{missing[:tall]}). Re-running missing parts (attempt #{attempts})...")
      model.start_operation("CBX: Repair missing cabinets (attempt #{attempts})", true)
      begin
        create_top_cabinets(top_params) if missing[:top]
        create_bottom_cabinets(bot_params) if missing[:bottom]
        create_tall_cabinet(tall_params) if missing[:tall]
      rescue StandardError => e
        puts 'Error during verify-and-rerun: ', e.message
      ensure
        model.commit_operation
      end
    end
  end

  # ----------------------------------------------------------------------
  #                     TOP CABINET ASSEMBLY
  # ----------------------------------------------------------------------
  def self.create_top_cabinets(params)
    x_offset       = params[:start_x] || 0.mm
    wall_length    = params[:wall_length]
    return if wall_length.nil? || wall_length <= 0

    base_height    = params[:height]
    base_depth     = params[:depth]
    mat_thickness  = params[:mat_thickness]
    back_thickness = params[:back_thickness]
    groove_depth   = params[:groove_depth]
    door_out_gap   = params[:door_out_gap]
    door_in_gap    = params[:door_in_gap]
    door_mat_thk   = params[:door_mat_thk]
    # For top cabinets, the old "corner" logic is now used for Cooker Hood Unit.
    cooker_hood_answer = params[:corner_answer]
    hood_space         = parse_mm(params[:corner_reduce].to_s) # space for hood (old corner_reduce)
    cooker_hood_width  = params[:cooker_hood_width] || 600.mm  # Hood width from UI
    params[:cooker_unit_width] || 600.mm # Bottom cooker unit width from UI
    box_str            = params[:box_widths_str]
    rack_str           = params[:rack_widths_str]
    params[:open_rack_shelf_count].to_i # ignored if open rack; forced to 2 below
    door_override      = params[:door_override] || 0.mm
    elevation          = params[:elevation] || 1500.mm
    project_name       = params[:project_name] || ''
    door_side_clear    = params[:door_side_clearance] || 3.mm
    door_system        = params[:door_system] || 'handled'

    prefix = project_name.empty? ? '' : "#{project_name} - "

    cooker_hood_exists = (cooker_hood_answer.to_s.strip.downcase == 'yes')

    model = Sketchup.active_model
    ents  = model.active_entities

    top_cab_count = 1

    # --- 1) Cooker Hood Unit ---
    if cooker_hood_exists
      # Hood is shorter (reduced by hood_space) but TOP level aligns with other top cabinets
      # So elevation must be RAISED so that hood_elev + hood_h = elevation + base_height
      hood_h = base_height - hood_space
      # Use width from UI
      hood_w = cooker_hood_width
      hood_w = wall_length if hood_w > wall_length

      # Raise hood elevation so top aligns with other top cabinets
      hood_elev = elevation + (base_height - hood_h) # Raise by the height difference

      c_grp = create_top_cabinet_at_offset(ents, x_offset, {
                                             elevation: hood_elev,
                                             width: hood_w, height: hood_h, depth: base_depth,
                                             mat_thickness: mat_thickness, back_thickness: back_thickness,
                                             groove_depth: groove_depth, door_out_gap: door_out_gap,
                                             door_in_gap: door_in_gap, door_mat_thk: door_mat_thk,
                                             open_rack: false, open_rack_shelf_count: 0,
                                             door_override: door_override,
                                             cab_index: top_cab_count,
                                             project_name: project_name,
                                             door_side_clearance: door_side_clear,
                                             door_system: door_system
                                           })
      c_grp.name = "#{prefix}Top Cabinet #{top_cab_count} (Cooker Hood Unit #{hood_w.to_l} mm, Height: #{hood_h.to_l})"
      top_cab_count += 1
      x_offset += hood_w
      wall_length -= hood_w
    end

    if wall_length <= 0
      UI.messagebox('No space left for top cabinets after Cooker Hood Unit.')
      return
    end

    # --- 2) Cabinet Widths (closed cabinets) ---
    box_widths = box_str.strip.empty? ? [] : box_str.split(',').map { |w| w.to_f.mm }
    box_widths.each do |bw|
      break if wall_length <= 0

      if bw > wall_length
        UI.messagebox("Top Cabinet: Cabinet width #{bw.to_l} mm > leftover #{wall_length.to_l} mm, skipping.")
        next
      end
      c_grp = create_top_cabinet_at_offset(ents, x_offset, {
                                             elevation: elevation,
                                             width: bw, height: base_height, depth: base_depth,
                                             mat_thickness: mat_thickness, back_thickness: back_thickness,
                                             groove_depth: groove_depth, door_out_gap: door_out_gap,
                                             door_in_gap: door_in_gap, door_mat_thk: door_mat_thk,
                                             open_rack: false, open_rack_shelf_count: 0,
                                             door_override: door_override,
                                             cab_index: top_cab_count,
                                             project_name: project_name,
                                             door_side_clearance: door_side_clear,
                                             door_system: door_system
                                           })
      c_grp.name = "#{prefix}Top Cabinet #{top_cab_count} (Cabinet #{bw.to_l} mm)"
      top_cab_count += 1
      x_offset += bw
      wall_length -= bw
    end

    if wall_length <= 0
      UI.messagebox('Wall used up with hood + cabinets (TOP).')
      return
    end

    # --- 3) Open Rack Cabinets (forced 2 shelves) ---
    rack_widths = rack_str.strip.empty? ? [] : rack_str.split(',').map { |w| w.to_f.mm }
    rack_widths.each do |rw|
      break if wall_length <= 0

      if rw > wall_length
        UI.messagebox("Open Rack #{rw.to_l} mm > leftover #{wall_length.to_l} mm, skipping.")
        next
      end
      c_grp = create_top_cabinet_at_offset(ents, x_offset, {
                                             elevation: elevation,
                                             width: rw, height: base_height, depth: base_depth,
                                             mat_thickness: mat_thickness, back_thickness: back_thickness,
                                             groove_depth: groove_depth, door_out_gap: door_out_gap,
                                             door_in_gap: door_in_gap, door_mat_thk: door_mat_thk,
                                             open_rack: true, open_rack_shelf_count: 2, # forced to 2 shelves
                                             door_override: door_override,
                                             cab_index: top_cab_count,
                                             project_name: project_name,
                                             door_side_clearance: door_side_clear,
                                             door_system: door_system
                                           })
      c_grp.name = "#{prefix}Top Cabinet #{top_cab_count} (Open Rack #{rw.to_l} mm, 2 shelves)"
      top_cab_count += 1
      x_offset += rw
      wall_length -= rw
    end

    if wall_length <= 0
      UI.messagebox('Wall used up with hood + cabinets + open racks (TOP).')
      return
    end

    # --- 4) Gap Absorption Logic ---
    # If gap > door_mat_thk, absorb it intelligently instead of creating tiny filler

    if wall_length > door_mat_thk
      # Try to fill with standard widths first
      fill_units, remainder = fill_leftover_units_for_top(wall_length)

      # If remainder still > door_mat_thk, distribute to fill units
      if remainder > door_mat_thk && fill_units.length > 0
        # Distribute remainder equally among fill units
        extra_per_unit = remainder / fill_units.length.to_f
        fill_units.map! { |fu| fu + extra_per_unit }
        remainder = 0.mm
      elsif remainder > door_mat_thk && rack_widths.length > 0
        # No fill units, give remainder to smallest open rack
        # Find smallest rack and add remainder to it
        smallest_idx = rack_widths.index(rack_widths.min)
        rack_widths[smallest_idx] += remainder
        remainder = 0.mm

        # NOTE: Racks already created above, so we need to store this for corner adjustment
        # For now, we'll just absorb into corner if this fails
      end

      # Create fill units (with absorbed gap if any)
      fill_units.each do |fu|
        c_grp = create_top_cabinet_at_offset(ents, x_offset, {
                                               elevation: elevation,
                                               width: fu, height: base_height, depth: base_depth,
                                               mat_thickness: mat_thickness, back_thickness: back_thickness,
                                               groove_depth: groove_depth, door_out_gap: door_out_gap,
                                               door_in_gap: door_in_gap, door_mat_thk: door_mat_thk,
                                               open_rack: false, open_rack_shelf_count: 0,
                                               door_override: door_override,
                                               cab_index: top_cab_count,
                                               project_name: project_name,
                                               door_side_clearance: door_side_clear,
                                               door_system: door_system
                                             })
        c_grp.name = "#{prefix}Top Cabinet #{top_cab_count} (Fill Cabinet #{fu.to_l} mm)"
        top_cab_count += 1
        x_offset += fu
        wall_length -= fu
      end

      # Update wall_length to remainder
      wall_length = remainder
    else
      # Gap <= door_mat_thk, create standard fill units without absorption
      fill_units, remainder = fill_leftover_units_for_top(wall_length)
      fill_units.each do |fu|
        c_grp = create_top_cabinet_at_offset(ents, x_offset, {
                                               elevation: elevation,
                                               width: fu, height: base_height, depth: base_depth,
                                               mat_thickness: mat_thickness, back_thickness: back_thickness,
                                               groove_depth: groove_depth, door_out_gap: door_out_gap,
                                               door_in_gap: door_in_gap, door_mat_thk: door_mat_thk,
                                               open_rack: false, open_rack_shelf_count: 0,
                                               door_override: door_override,
                                               cab_index: top_cab_count,
                                               project_name: project_name,
                                               door_side_clearance: door_side_clear,
                                               door_system: door_system
                                             })
        c_grp.name = "#{prefix}Top Cabinet #{top_cab_count} (Fill Cabinet #{fu.to_l} mm)"
        top_cab_count += 1
        x_offset += fu
        wall_length -= fu
      end
      # Update wall_length to remainder (important for corner absorption!)
      wall_length = remainder
    end

    # Store final gap for corner absorption (if corner enabled)
    params[:final_gap] = wall_length
    # Store actual used length (excluding start_x offset)
    params[:used_length] = x_offset - (params[:start_x] || 0.mm)

    # --- 5) No tiny filler - gap absorbed or will be absorbed by corner ---

    UI.messagebox("TOP Cabinets done.\nUsed #{x_offset.to_l} mm from start_x. Final gap= #{wall_length.to_l} mm (will be absorbed by corner if enabled).")
  end

  # ----------------------------------------------------------------------
  #                   MAIN HTML DIALOG WITH TABBED INTERFACE
  # ----------------------------------------------------------------------
  def self.show_html_dialog
    # ═══════════════════════════════════════════════════════════════════
    # ✨ AUTO-INJECT PLACEHOLDER DIMENSIONS IF SELECTED
    # ═══════════════════════════════════════════════════════════════════
    model = Sketchup.active_model
    selection = model.selection
    
    placeholder_width = nil
    placeholder_depth = nil
    placeholder_height = nil
    placeholder_type = nil
    
    # Check if user has selected a CBX placeholder
    if selection.length == 1
      entity = selection[0]
      if entity.is_a?(Sketchup::Group)
        cbx_type = entity.get_attribute('CBX', 'type')
        if cbx_type && ['bottom', 'top', 'tall'].include?(cbx_type)
          placeholder_width = entity.get_attribute('CBX', 'width').to_f
          placeholder_depth = entity.get_attribute('CBX', 'depth').to_f
          placeholder_height = entity.get_attribute('CBX', 'height').to_f
          placeholder_type = cbx_type
          puts "✓ Placeholder detected! Auto-filling: #{placeholder_width}×#{placeholder_depth}×#{placeholder_height}"
        end
      end
    end
    
    dlg = UI::HtmlDialog.new(
      dialog_title: 'CBX Handle System Selector with Settings Tab',
      preferences_key: 'CBXHandleSysSettings-UI',
      scrollable: true,
      resizable: true,
      width: 750,
      height: 850
    )

    html = <<-HTML
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: 12px;
          padding: 10px;
          margin: 0;
          background: #f5f5f5;
        }
    #{'    '}
        h2 {
          margin: 0 0 15px;
          padding: 10px;
          background: #2c3e50;
          color: white;
          font-size: 14px;
          text-align: center;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    #{'    '}
        .project-name {
          margin-bottom: 15px;
          text-align: center;
        }
    #{'    '}
        .project-name input {
          width: 250px;
          padding: 5px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
    #{'    '}
        /* ⚡ SHOTGUN SECTION STYLES ⚡ */
        .shotgun-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 3px solid #ffd700;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
    #{'    '}
        .shotgun-title {
          color: #fff;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          margin-bottom: 12px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
    #{'    '}
        .shotgun-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
    #{'    '}
        .btn-shotgun {
          padding: 14px 8px;
          font-size: 11px;
          font-weight: bold;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 3px 5px rgba(0,0,0,0.3);
          text-align: center;
        }
    #{'    '}
        .btn-shotgun:hover {
          transform: translateY(-3px);
          box-shadow: 0 6px 12px rgba(0,0,0,0.4);
        }
    #{'    '}
        .btn-shotgun:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
    #{'    '}
        .btn-all-top { background: linear-gradient(135deg, #4CAF50, #45a049); }
        .btn-all-bottom { background: linear-gradient(135deg, #2196F3, #1976D2); }
        .btn-one-top { background: linear-gradient(135deg, #8BC34A, #7CB342); }
        .btn-one-bottom { background: linear-gradient(135deg, #03A9F4, #0288D1); }
        .btn-two-door { background: linear-gradient(135deg, #0891b2, #0e7490); }
        .btn-one-open { background: linear-gradient(135deg, #CDDC39, #C0CA33); color: #333; }
        .btn-sink { background: linear-gradient(135deg, #00BCD4, #0097A7); }
        .btn-cooker-unit { background: linear-gradient(135deg, #FF5722, #E64A19); }
        .btn-cooker-hood { background: linear-gradient(135deg, #9C27B0, #7B1FA2); }
        .btn-corner-top { background: linear-gradient(135deg, #FF9800, #F57C00); }
        .btn-corner-bottom { background: linear-gradient(135deg, #f59e0b, #d97706); }
        .btn-tall { background: linear-gradient(135deg, #795548, #5D4037); }
        .btn-tall { background: linear-gradient(135deg, #795548, #5D4037); }
    #{'    '}
        .door-system-selector {
          background: #e8f4f8;
          border: 2px solid #3498db;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
          text-align: center;
        }
    #{'    '}
        .door-system-selector h3 {
          margin: 0 0 10px;
          color: #2c3e50;
          font-size: 16px;
        }
    #{'    '}
        .door-system-options {
          display: flex;
          justify-content: center;
          gap: 30px;
        }
    #{'    '}
        .door-system-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
          color: #2c3e50;
        }
    #{'    '}
        .door-system-option input[type="radio"] {
          transform: scale(1.2);
        }
    #{'    '}
        /* Tab Styles */
        .tab-container {
          margin-bottom: 15px;
        }
    #{'    '}
        .tab-buttons {
          display: flex;
          background: #ecf0f1;
          border-radius: 6px 6px 0 0;
          overflow: hidden;
        }
    #{'    '}
        .tab-button {
          flex: 1;
          padding: 12px 20px;
          background: #bdc3c7;
          border: none;
          cursor: pointer;
          font-weight: bold;
          color: #2c3e50;
          transition: all 0.3s;
        }
    #{'    '}
        .tab-button.active {
          background: #3498db;
          color: white;
        }
    #{'    '}
        .tab-button:hover {
          background: #34495e;
          color: white;
        }
    #{'    '}
        .tab-content {
          display: none;
          background: white;
          border: 2px solid #3498db;
          border-radius: 0 0 6px 6px;
          padding: 20px;
        }
    #{'    '}
        .tab-content.active {
          display: block;
        }
    #{'    '}
        .row {
          display: flex;
          gap: 15px;
          margin-bottom: 15px;
        }
    #{'    '}
        .col {
          flex: 1;
          background: #f8f9fa;
          padding: 15px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    #{'    '}
        .section-title {
          font-weight: bold;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #3498db;
          color: #2c3e50;
          font-size: 14px;
        }
    #{'    '}
        .field {
          margin: 8px 0;
          display: flex;
          align-items: center;
        }
    #{'    '}
        .field label {
          flex: 1;
          margin-right: 8px;
          font-weight: 500;
        }
    #{'    '}
        .field input[type="text"] {
          width: 80px;
          padding: 4px 6px;
          border: 1px solid #ddd;
          border-radius: 3px;
        }
    #{'    '}
        .field input[type="checkbox"] {
          margin-right: 8px;
          transform: scale(1.1);
        }
    #{'    '}
        .field select {
          width: 90px;
          padding: 4px 6px;
          border: 1px solid #ddd;
          border-radius: 3px;
        }
    #{'    '}
        .buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 20px;
          padding: 15px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    #{'    '}
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          font-weight: bold;
        }
    #{'    '}
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 6px rgba(0,0,0,0.15);
        }
    #{'    '}
        .btn-create {
          background: #27ae60;
          color: white;
        }
    #{'    '}
        .btn-export {
          background: #95a5a6;
          color: white;
        }
    #{'    '}
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }
      </style>
    </head>
    <body>
      <!-- ⚡ SHOTGUN QUICK CREATE SECTION ⚡ -->
      <div class="shotgun-section">
        <div class="shotgun-title">⚡ SHOTGUN Quick Create Individual Units ⚡</div>
        <div class="shotgun-grid">
          <button class="btn-shotgun btn-all-top" onclick="shotgunPrompt('all_top')">🎯 All Top Cabinets</button>
          <button class="btn-shotgun btn-all-bottom" onclick="shotgunPrompt('all_bottom')">🎯 All Bottom Cabinets</button>
          <button class="btn-shotgun btn-one-top" onclick="shotgunPrompt('one_top')">📦 One Top Cabinet</button>
          <button class="btn-shotgun btn-one-bottom" onclick="shotgunPrompt('one_bottom')">📦 One Bottom Drawer</button>
          <button class="btn-shotgun btn-two-door" onclick="shotgunPrompt('two_door_bottom')">🚪 Two Door Bottom</button>
          <button class="btn-shotgun btn-one-open" onclick="shotgunPrompt('one_open')">📖 One Open Rack</button>
          <button class="btn-shotgun btn-sink" onclick="shotgunPrompt('sink')">🚰 Sink Unit</button>
          <button class="btn-shotgun btn-cooker-unit" onclick="shotgunPrompt('cooker_unit')">🔥 Cooker Unit</button>
          <button class="btn-shotgun btn-cooker-hood" onclick="shotgunPrompt('cooker_hood')">🌬️ Cooker Hood + Panels</button>
          <button class="btn-shotgun btn-corner-top" onclick="shotgunPrompt('corner_top')">🔺 Top Corner</button>
          <button class="btn-shotgun btn-corner-bottom" onclick="shotgunPrompt('corner_bottom')">🔻 Bottom Corner</button>
          <button class="btn-shotgun btn-tall" onclick="shotgunPrompt('tall')">🏢 Tall Unit</button>
        </div>
      </div>

      <h2>CBX Handle System Selector with Settings Tab</h2>
    #{'  '}
      <div class="project-name">
        <input type="text" id="project_name" placeholder="Project Name (e.g. Mr Jones Kitchen)" />
      </div>

      <div class="door-system-selector">
        <h3>Door System Selection</h3>
        <div class="door-system-options">
          <div class="door-system-option">
            <input type="radio" id="door_system_handled" name="door_system" value="handled" checked />
            <label for="door_system_handled">Normal Handled System</label>
          </div>
          <div class="door-system-option">
            <input type="radio" id="door_system_gola" name="door_system" value="gola" />
            <label for="door_system_gola">L/C Gola Handleless System</label>
          </div>
        </div>
      </div>

      <div class="tab-container">
        <div class="tab-buttons">
          <button class="tab-button active" onclick="showTab('settings')">Settings</button>
          <button class="tab-button" onclick="showTab('top')">Top Cabinets</button>
          <button class="tab-button" onclick="showTab('bottom')">Bottom Cabinets</button>
          <button class="tab-button" onclick="showTab('tall')">Tall Cabinets</button>
        </div>

        <!-- SETTINGS TAB -->
        <div id="settings-tab" class="tab-content active">
          <div class="section-title">Common Settings</div>
          <div class="settings-grid">
            <div class="col">
              <div class="section-title">Panel Thickness Settings</div>
              <p class="field"><label>Panel Thickness (mm):</label><input type="text" id="panel_thickness" value="18"/></p>
              <p class="field"><label>Back Panel Thickness (mm):</label><input type="text" id="back_thickness" value="6"/></p>
              <p class="field"><label>Door Material Thickness (mm):</label><input type="text" id="door_thickness" value="18"/></p>
              <p class="field"><label>Face Material Thickness (mm):</label><input type="text" id="face_thickness" value="18"/></p>
            </div>
    #{'        '}
            <div class="col">
              <div class="section-title">Gap & Clearance Settings</div>
              <p class="field"><label>Groove Depth (mm):</label><input type="text" id="groove_depth" value="5"/></p>
              <p class="field"><label>Door Outer Gap (mm):</label><input type="text" id="door_outer_gap" value="3"/></p>
              <p class="field"><label>Door Inner Gap (mm):</label><input type="text" id="door_inner_gap" value="3"/></p>
              <p class="field"><label>Door Side Clearance (mm):</label><input type="text" id="door_side_clearance" value="3"/></p>
              <p class="field"><label>Edge Band Thickness (mm):</label><input type="text" id="edge_band_thickness" value="1"/></p>
            </div>
    #{'        '}
            <div class="col">
              <div class="section-title">Default Sizes</div>
              <p class="field"><label>Default Top Height (mm):</label><input type="text" id="default_top_height" value="720"/></p>
              <p class="field"><label>Default Top Depth (mm):</label><input type="text" id="default_top_depth" value="350"/></p>
              <p class="field"><label>Default Bottom Height (mm):</label><input type="text" id="default_bottom_height" value="870"/></p>
              <p class="field"><label>Default Bottom Depth (mm):</label><input type="text" id="default_bottom_depth" value="560"/></p>
              <p class="field"><label>Default Plinth Height (mm):</label><input type="text" id="default_plinth_height" value="100"/></p>
              <p class="field"><label>Default Tall Height (mm):</label><input type="text" id="default_tall_height" value="2100"/></p>
              <p class="field"><label>Default Tall Width (mm):</label><input type="text" id="default_tall_width" value="450"/></p>
              <p class="field"><label>Default Tall Depth (mm):</label><input type="text" id="default_tall_depth" value="600"/></p>
            </div>
    #{'        '}
            <div class="col">
              <div class="section-title">Corner Position (Global)</div>
              <p class="field">
                <label>Corner Cabinets Position:</label>
                <select id="global_corner_position">
                  <option value="right" selected>Right Side</option>
                  <option value="left">Left Side</option>
                </select>
              </p>
              <p class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                This setting applies to both top and bottom corner cabinets.<br/>
                Right = Corner at end of wall, Tall at start<br/>
                Left = Corner at start of wall, Tall after corner
              </p>
            </div>
          </div>
        </div>

        <!-- TOP CABINETS TAB -->
        <div id="top-tab" class="tab-content">
          <div class="col">
            <div class="section-title">Top Cabinets Configuration</div>
            <p class="field">
              <label>Enable Top Cabinets:</label>
              <select id="enable_top">
                <option value="true" selected>Yes</option>
                <option value="false">No</option>
              </select>
            </p>
            <p class="field"><label>Wall Length (mm):</label><input type="text" id="top_wall_length" value="3600"/></p>
            <p class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
              Height and Depth use defaults from Settings tab
            </p>
            <p class="field">
              <label>Cooker Hood Unit:</label>
              <select id="top_corner">
                <option value="Yes" selected>Yes</option>
                <option value="No">No</option>
              </select>
            </p>
            <p class="field"><label>Hood Width (mm):</label><input type="text" id="cooker_hood_width" value="600"/></p>
            <p class="field"><label>Space for Hood (mm):</label><input type="text" id="top_corner_reduce" value="150"/></p>
            <p class="field"><label>Cooker Unit Width (mm):</label><input type="text" id="cooker_unit_width" value="600"/></p>
            <p class="field"><label>Cabinet Widths (comma separated):</label><input type="text" id="top_box_widths" value="600,600" style="width: 150px;"/></p>
            <p class="field"><label>Open Rack Widths (comma separated):</label><input type="text" id="top_rack_widths" value="450,300" style="width: 150px;"/></p>
            <p class="field">
              <label>Open Rack Position:</label>
              <select id="open_rack_position">
                <option value="none" selected>None</option>
                <option value="left_of_cooker">Left of Cooker</option>
                <option value="right_of_cooker">Right of Cooker</option>
              </select>
            </p>
            <p class="field"><label>Door Override for Gola (mm):</label><input type="text" id="top_door_override" value="20"/></p>
    #{'        '}
            <div class="section-title">Top Corner Cabinet</div>
            <p class="field">
              <label>Enable Top Corner:</label>
              <select id="enable_top_corner">
                <option value="false" selected>No</option>
                <option value="true">Yes</option>
              </select>
            </p>
            <p class="field"><label>Top Corner Width (mm):</label><input type="text" id="top_corner_width" value="750"/></p>
            <p class="field"><label>Top Corner Blind Width (mm):</label><input type="text" id="top_corner_blind_width" value="350"/></p>
            <p class="field">
              <label title="Gap between top corner blind panel and next unit">Blind Panel Extension (mm):</label>
              <input type="text" id="top_corner_depth_adjust" value="25" title="Distance blind panel extends beyond cabinet depth (typically 25mm)"/>
            </p>
          </div>
            </p>
          </div>
        </div>

        <!-- BOTTOM CABINETS TAB -->
        <div id="bottom-tab" class="tab-content">
          <div class="row">
            <div class="col">
              <div class="section-title">Bottom Cabinets Configuration</div>
              <p class="field">
                <label>Enable Bottom Cabinets:</label>
                <select id="enable_bottom">
                  <option value="true" selected>Yes</option>
                  <option value="false">No</option>
                </select>
              </p>
              <p class="field"><label>Total Width (mm):</label><input type="text" id="bot_total_width" value="3600"/></p>
              <p class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
                Height and Depth use defaults from Settings tab
              </p>
              <p class="field"><label>Drawer Widths (comma separated):</label><input type="text" id="bot_drawer_str" value="600,650" style="width: 120px;"/></p>
              <p class="field"><label>Drawer Count:</label>
                <select id="bot_drawer_count">
                  <option value="2" selected>2</option>
                  <option value="3">3</option>
                </select>
              </p>
              <p class="field"><label>Door Sequence (comma separated):</label><input type="text" id="bot_door_seq" value="" style="width: 120px;"/></p>
              <p class="field"><label>Shelves for Door Units:</label><input type="text" id="bot_shelf_count" value="1"/></p>
            </div>
    #{'        '}
            <div class="col">
              <div class="section-title">Special Units</div>
              <p class="field">
                <label>Sink Cabinet:</label>
                <select id="bot_sink_cab">
                  <option value="Yes" selected>Yes</option>
                  <option value="No">No</option>
                </select>
              </p>
              <p class="field"><label>Sink Width (mm):</label><input type="text" id="bot_sink_width" value="800"/></p>
              <p class="field">
                <label>Cocker Unit:</label>
                <select id="bot_cocker_unit">
                  <option value="No" selected>No</option>
                  <option value="Yes">Yes</option>
                </select>
              </p>
              <p class="field"><label>Cocker Width (mm):</label><input type="text" id="bot_cocker_width" value="600"/></p>
            </div>
    #{'        '}
            <div class="col">
              <div class="section-title">Corner Cabinet</div>
              <p class="field">
                <label>Enable Corner Cabinet:</label>
                <select id="enable_corner">
                  <option value="false" selected>No</option>
                  <option value="true">Yes</option>
                </select>
              </p>
              <p class="field"><label>Corner Cabinet Width (mm):</label><input type="text" id="bot_corner_width" value="1050"/></p>
              <p class="field"><label>Blind Panel Width (mm):</label><input type="text" id="bot_corner_blind_width" value="625"/></p>
            </div>
          </div>
        </div>

        <!-- TALL CABINETS TAB -->
        <div id="tall-tab" class="tab-content">
          <div class="col">
            <div class="section-title">Tall Cabinets Configuration</div>
            <p class="field">
              <label>Enable Tall Cabinets:</label>
              <select id="enable_tall">
                <option value="true" selected>Yes</option>
                <option value="false">No</option>
              </select>
            </p>
            <p class="field"><label>Total Height (mm):</label><input type="text" id="tall_total_height" value="2100"/></p>
            <p class="field"><label>Plinth Height (mm):</label><input type="text" id="tall_plinth_height" value="100"/></p>
            <p class="field"><label>Width (mm):</label><input type="text" id="tall_width" value="450"/></p>
            <p class="field"><label>Depth (mm):</label><input type="text" id="tall_depth" value="600"/></p>
            <p class="field"><label>Carcase Thickness (mm):</label><input type="text" id="tall_carcase_thk" value="15"/></p>
            <p class="field"><label>Number of Shelves:</label><input type="text" id="tall_shelf_count" value="3"/></p>
            <p class="field"><label>Door Gap (mm):</label><input type="text" id="tall_door_gap" value="10"/></p>
    #{'        '}
            <div class="section-title">Tall Unit Side Panels</div>
            <p class="field">
              <label>Side Panel Configuration:</label>
              <select id="tall_side_panels">
                <option value="none" selected>No Side Panels</option>
                <option value="both">Both Sides Covered</option>
                <option value="left_100mm">Left Side + 100mm Deep Panel</option>
                <option value="right_100mm">Right Side + 100mm Deep Panel</option>
                <option value="left_only">Left Side Only (Flush)</option>
                <option value="right_only">Right Side Only (Flush)</option>
              </select>
            </p>
            <p class="info-text" style="font-size: 11px; color: #666; margin-top: 5px;">
              100mm deep panels extend forward from the cabinet face
            </p>
          </div>
        </div>
      </div>

      <div class="buttons">
        <button class="btn btn-create" id="createBtn">Create Cabinets</button>
        <button class="btn btn-export" id="exportBtn">Export Part List</button>
      </div>

      <script>
      function showTab(tabName) {
        // Hide all tab contents
        const tabs = document.querySelectorAll('.tab-content');
        tabs.forEach(tab => tab.classList.remove('active'));
    #{'    '}
        // Remove active class from all buttons
        const buttons = document.querySelectorAll('.tab-button');
        buttons.forEach(btn => btn.classList.remove('active'));
    #{'    '}
        // Show selected tab and activate button
        document.getElementById(tabName + '-tab').classList.add('active');
        event.target.classList.add('active');
      }
    #{'  '}
      // ⚡ SHOTGUN WITH INTERACTIVE PROMPTS ⚡
      function shotgunPrompt(type) {
        var data = getFormData();
        data.shotgun_mode = type;
    #{'    '}
        // Get prompts based on type
        switch(type) {
          case 'one_top':
            var width = prompt("Enter Top Cabinet Width (mm):", "600");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'one_bottom':
            var width = prompt("Enter Bottom Drawer Unit Width (mm):", "600");
            if (!width) return;
            var drawers = prompt("Number of Drawers (2 or 3):", "2");
            if (!drawers) return;
            data.shotgun_width = width;
            data.shotgun_drawers = drawers;
            break;
          case 'two_door_bottom':
            var width = prompt("Enter Two Door Bottom Cabinet Width (mm):", "900");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'one_open':
            var width = prompt("Enter Open Rack Width (mm):", "600");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'sink':
            var width = prompt("Enter Sink Unit Width (mm):", "900");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'cooker_unit':
            var width = prompt("Enter Cooker Unit Width (mm):", "600");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'cooker_hood':
            var width = prompt("Enter Cooker Hood Width (mm):", "900");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'corner_top':
            var width = prompt("Enter Top Corner Width (mm):", "750");
            if (!width) return;
            data.shotgun_width = width;
            break;
          case 'corner_bottom':
            var width = prompt("Enter Bottom Corner Width (mm):", "900");
            if (!width) return;
            data.shotgun_width = width;
            break;
        }
    #{'    '}
        sketchup.create_cabinets_callback(JSON.stringify(data));
      }
    #{'  '}
      function getFormData() {
        const doorSystem = document.querySelector('input[name="door_system"]:checked').value;
    #{'    '}
        return {
          project_name: document.getElementById('project_name').value,
          door_system: doorSystem,
    #{'      '}
          // SETTINGS (Common)
          panel_thickness: document.getElementById('panel_thickness').value,
          back_thickness: document.getElementById('back_thickness').value,
          door_thickness: document.getElementById('door_thickness').value,
          face_thickness: document.getElementById('face_thickness').value,
          groove_depth: document.getElementById('groove_depth').value,
          door_outer_gap: document.getElementById('door_outer_gap').value,
          door_inner_gap: document.getElementById('door_inner_gap').value,
          door_side_clearance: document.getElementById('door_side_clearance').value,
          edge_band_thickness: document.getElementById('edge_band_thickness').value,
          global_corner_position: document.getElementById('global_corner_position').value,
          default_top_height: document.getElementById('default_top_height').value,
          default_top_depth: document.getElementById('default_top_depth').value,
          default_bottom_height: document.getElementById('default_bottom_height').value,
          default_bottom_depth: document.getElementById('default_bottom_depth').value,
    #{'      '}
          // TOP
          enable_top: document.getElementById('enable_top').value === 'true',
          top_wall_length: document.getElementById('top_wall_length').value,
          top_corner: document.getElementById('top_corner').value,
          cooker_hood_width: document.getElementById('cooker_hood_width').value,
          top_corner_reduce: document.getElementById('top_corner_reduce').value,
          cooker_unit_width: document.getElementById('cooker_unit_width').value,
          top_box_widths: document.getElementById('top_box_widths').value,
          top_rack_widths: document.getElementById('top_rack_widths').value,
          open_rack_position: document.getElementById('open_rack_position').value,
          top_door_override: document.getElementById('top_door_override').value,
          enable_top_corner: document.getElementById('enable_top_corner').value === 'true',
          top_corner_width: document.getElementById('top_corner_width').value,
          top_corner_blind_width: document.getElementById('top_corner_blind_width').value,
          top_corner_depth_adjust: document.getElementById('top_corner_depth_adjust').value,

          // BOTTOM
          enable_bottom: document.getElementById('enable_bottom').value === 'true',
          bot_total_width: document.getElementById('bot_total_width').value,
          bot_drawer_str: document.getElementById('bot_drawer_str').value,
          bot_drawer_count: document.getElementById('bot_drawer_count').value,
          bot_door_seq: document.getElementById('bot_door_seq').value,
          bot_shelf_count: document.getElementById('bot_shelf_count').value,
          bot_sink_cab: document.getElementById('bot_sink_cab').value,
          bot_sink_width: document.getElementById('bot_sink_width').value,
          bot_cocker_unit: document.getElementById('bot_cocker_unit').value,
          bot_cocker_width: document.getElementById('bot_cocker_width').value,
          enable_corner: document.getElementById('enable_corner').value === 'true',
          bot_corner_width: document.getElementById('bot_corner_width').value,
          bot_corner_blind_width: document.getElementById('bot_corner_blind_width').value,

          // TALL
          enable_tall: document.getElementById('enable_tall').value === 'true',
          tall_total_height: document.getElementById('tall_total_height').value,
          tall_plinth_height: document.getElementById('tall_plinth_height').value,
          tall_width: document.getElementById('tall_width').value,
          tall_depth: document.getElementById('tall_depth').value,
          tall_carcase_thk: document.getElementById('tall_carcase_thk').value,
          tall_shelf_count: document.getElementById('tall_shelf_count').value,
          tall_door_gap: document.getElementById('tall_door_gap').value,
          tall_side_panels: document.getElementById('tall_side_panels').value
        };
      }

      document.getElementById('createBtn').addEventListener('click', function() {
        var data = getFormData();
        sketchup.create_cabinets_callback(JSON.stringify(data));
      });

      document.getElementById('exportBtn').addEventListener('click', function() {
        sketchup.export_part_list();
      });
      
      // ═══════════════════════════════════════════════════════════════════
      // ✨ AUTO-FILL FROM SELECTED PLACEHOLDER
      // ═══════════════════════════════════════════════════════════════════
      #{if placeholder_width && placeholder_depth && placeholder_height
        "// Placeholder detected! Auto-filling dimensions\n" +
        "      document.getElementById('wall_length').value = #{placeholder_width.round};\n" +
        "      document.getElementById('cabinet_depth').value = #{placeholder_depth.round};\n" +
        "      document.getElementById('cabinet_height').value = #{placeholder_height.round};\n" +
        "      document.getElementById('top_wall_length').value = #{placeholder_width.round};\n" +
        "      document.getElementById('tall_wall_length').value = #{placeholder_width.round};\n" +
        "      console.log('✓ Auto-filled from placeholder: #{placeholder_width.round}×#{placeholder_depth.round}×#{placeholder_height.round}mm');\n" +
        "      alert('✓ Placeholder dimensions loaded!\\n\\nWidth: #{placeholder_width.round}mm\\nDepth: #{placeholder_depth.round}mm\\nHeight: #{placeholder_height.round}mm\\n\\nConfigure settings and click Create!');"
      else
        "// No placeholder selected"
      end}
      </script>
    </body>
    </html>
    HTML

    dlg.set_html(html)

    dlg.add_action_callback('create_cabinets_callback') do |_ctx, json_data|
      require 'json'
      form = JSON.parse(json_data)
      project_name = form['project_name'] || ''
      door_system = form['door_system'] || 'handled'
      form['global_corner_position'] || 'right' # Get global corner setting

      model = Sketchup.active_model
      model.start_operation('Create Cabinets', true)

      # Use common settings from the settings tab (normalize names)
      common_panel_thk = parse_mm(form['panel_thickness'] || form['panel_thk'])
      common_back_thk = parse_mm(form['back_thickness'] || form['back_thk'])
      common_door_thk = parse_mm(form['door_thickness'] || form['door_thk'])
      common_face_thk = parse_mm(form['face_thickness'] || form['face_mat_thk'])
      common_groove_depth = parse_mm(form['groove_depth'] || form['groove_depth'])
      common_door_outer_gap = parse_mm(form['door_outer_gap'] || form['door_out_gap'])
      common_door_inner_gap = parse_mm(form['door_inner_gap'] || form['door_in_gap'])
      common_door_side_clear = parse_mm(form['door_side_clearance'] || form['door_side_clearance'])
      common_edge_band_thk = parse_mm(form['edge_band_thickness'] || form['edge_band_thk'])

      # TOP CABINETS
      top_params = {}
      top_params[:start_x] = 0.mm
      top_params[:wall_length] = parse_mm(form['top_wall_length'])
      # Use default values from Settings tab instead of section-specific inputs
      top_params[:height] = parse_mm(form['default_top_height'] || '720')
      top_params[:depth] = parse_mm(form['default_top_depth'] || '350')
      top_params[:mat_thickness] = common_panel_thk
      top_params[:back_thickness] = common_back_thk
      top_params[:groove_depth] = common_groove_depth
      top_params[:door_out_gap] = common_door_outer_gap
      top_params[:door_in_gap] = common_door_inner_gap
      top_params[:door_mat_thk] = common_door_thk
      top_params[:corner_answer] = form['top_corner']
      top_params[:cooker_hood_width] = parse_mm(form['cooker_hood_width'])
      top_params[:corner_reduce] = parse_mm(form['top_corner_reduce'])
      top_params[:cooker_unit_width] = parse_mm(form['cooker_unit_width'])
      top_params[:box_widths_str] = form['top_box_widths']
      top_params[:rack_widths_str] = form['top_rack_widths']
      top_params[:open_rack_position] = form['open_rack_position']
      top_params[:open_rack_shelf_count] = 3
      top_params[:door_override] = door_system == 'gola' ? parse_mm(form['top_door_override']) : 0.mm
      top_params[:project_name] = project_name
      top_params[:door_system] = door_system
      top_params[:door_side_clearance] = common_door_side_clear
      top_params[:enable_top_corner] = form['enable_top_corner']
      top_params[:top_corner_width] = parse_mm(form['top_corner_width'])
      top_params[:top_corner_blind_width] = parse_mm(form['top_corner_blind_width'])
      top_params[:corner_depth_adjust] = parse_mm(form['top_corner_depth_adjust'])

      # BOTTOM CABINETS
      bot_params = {}
      bot_params[:start_x] = 0.mm
      bot_params[:target_total_width] = parse_mm(form['bot_total_width'])
      # Use default values from Settings tab
      bot_params[:height] = parse_mm(form['default_bottom_height'] || '870')
      bot_params[:depth] = parse_mm(form['default_bottom_depth'] || '560')
      bot_params[:panel_thk] = common_panel_thk
      bot_params[:back_thk] = common_back_thk
      bot_params[:plinth] = parse_mm('100') # Default plinth
      bot_params[:shelf_count_for_doors] = form['bot_shelf_count'].to_i
      bot_params[:groove_depth] = common_groove_depth
      bot_params[:door_gap] = common_door_inner_gap
      bot_params[:door_side_clearance] = common_door_side_clear
      bot_params[:edge_band_thk] = common_edge_band_thk
      bot_params[:face_mat_thk] = common_face_thk
      # ensure backward compatibility
      bot_params[:edge_band_thickness] = common_edge_band_thk
      bot_params[:face_thickness] = common_face_thk
      bot_params[:drawer_str] = form['bot_drawer_str']
      bot_params[:bot_drawer_count] = form['bot_drawer_count'].to_i
      bot_params[:bot_door_seq] = form['bot_door_seq']
      bot_params[:bot_sink_cab] = form['bot_sink_cab']
      bot_params[:bot_sink_width] = parse_mm(form['bot_sink_width'])
      bot_params[:bot_cocker_unit] = form['bot_cocker_unit']
      # Use cooker_unit_width from top section if cooker hood is enabled, otherwise use bot_cocker_width
      bot_params[:bot_cocker_width] = if form['top_corner'] && form['top_corner'].to_s.strip.downcase == 'yes'
                                        parse_mm(form['cooker_unit_width'])
                                      else
                                        parse_mm(form['bot_cocker_width'])
                                      end
      bot_params[:enable_corner] = form['enable_corner']
      bot_params[:bot_corner_width] = parse_mm(form['bot_corner_width'])
      bot_params[:bot_corner_blind_width] = parse_mm(form['bot_corner_blind_width'])
      bot_params[:project_name] = project_name
      bot_params[:door_system] = door_system
      bot_params[:door_thickness] = common_door_thk

      # TALL CABINETS
      tall_params = {}
      tall_params[:enabled] = form['enable_tall'] == true # Store enabled state
      tall_params[:total_height] = parse_mm(form['tall_total_height'])
      tall_params[:plinth_height] = parse_mm(form['tall_plinth_height'])
      tall_params[:cabinet_width] = parse_mm(form['tall_width'])
      tall_params[:cabinet_depth] = parse_mm(form['tall_depth'])
      tall_params[:door_thickness] = common_door_thk
      tall_params[:carcase_thk] = parse_mm(form['tall_carcase_thk'])
      tall_params[:back_thk] = common_back_thk
      tall_params[:groove_depth] = common_groove_depth
      tall_params[:tall_shelf_count] = form['tall_shelf_count'].to_i
      tall_params[:door_gap] = parse_mm(form['tall_door_gap'])
      tall_params[:side_panels] = form['tall_side_panels']
      tall_params[:project_name] = project_name

      # IMPROVED CORNER CABINET LOGIC
      # Corner cabinet should go to actual corner (end of run) unless only tall + corner
      corner_position = :end # Default to end position

      total_units = 0
      total_units += 1 if form['enable_tall']
      total_units += 1 if form['enable_corner']
      total_units += 1 if !form['bot_drawer_str'].strip.empty? || !form['bot_door_seq'].strip.empty?
      total_units += 1 if form['bot_sink_cab'] == 'Yes'
      total_units += 1 if form['bot_cocker_unit'] == 'Yes'

      # If we only have tall + corner, put corner adjacent to tall
      corner_position = :adjacent_to_tall if total_units == 2 && form['enable_tall'] && form['enable_corner']

      # Calculate positioning
      0.mm

      # GLOBAL KITCHEN HEIGHT - All top cabinets align to this MAX Z
      global_kitchen_height = 2100.mm # Default kitchen height

      # Check if tall unit will be created (for height calculation only, don't create yet)
      if form['enable_tall'] == true
        # Tall unit MAX Z = total_height (plinth + cabinet_body_hgt)
        tall_total_height = tall_params[:total_height] || 2100.mm

        # If tall unit is taller than global, increase global to tall unit height
        global_kitchen_height = tall_total_height if tall_total_height > global_kitchen_height
      end

      # Calculate top cabinet elevation from global kitchen height
      # All top cabinets (regular, corner, cooker) align to global_kitchen_height
      top_ui_height = top_params[:height] || 720.mm
      top_params[:elevation] = global_kitchen_height - top_ui_height

      # ⚡⚡⚡ SHOTGUN MODE ROUTING ⚡⚡⚡
      shotgun_mode = form['shotgun_mode']
      if shotgun_mode
        # Get custom parameters from prompts
        custom_width = form['shotgun_width'] ? parse_mm(form['shotgun_width'].to_s) : nil
        custom_drawers = form['shotgun_drawers'] ? form['shotgun_drawers'].to_i : 2

        # Shotgun creates single units at origin, not full layouts
        case shotgun_mode
        when 'all_top'
          # Set wall_length for full top row
          top_params[:wall_length] = parse_mm(form['top_wall_length']) if form['top_wall_length']
          if top_params[:wall_length] && top_params[:wall_length] > 0
            create_top_cabinets(top_params)
            UI.messagebox('✓ All Top Cabinets Created!')
          else
            UI.messagebox("❌ Please set 'Top Wall Length' in the TOP CABINETS tab!\n\nGo to: Top Cabinets tab → Enter wall length")
          end
        when 'all_bottom'
          # Set wall_length for full bottom row
          bot_params[:wall_length] = parse_mm(form['bot_wall_length']) if form['bot_wall_length']
          if bot_params[:wall_length] && bot_params[:wall_length] > 0
            create_bottom_cabinets(bot_params)
            UI.messagebox('✓ All Bottom Cabinets Created!')
          else
            UI.messagebox("❌ Please set 'Bottom Wall Length' in the BOTTOM CABINETS tab!\n\nGo to: Bottom Cabinets tab → Enter wall length")
          end
        when 'one_top'
          single_top_params = top_params.dup
          single_top_params[:width] = custom_width || 600.mm
          single_top_params[:cab_index] = 1
          create_top_cabinet_at_offset(model.entities, 0.mm, single_top_params)
          UI.messagebox("✓ One Top Cabinet (#{single_top_params[:width].to_l}) Created at origin!")
        when 'one_bottom'
          # Create drawer unit with custom width and drawer count
          drawer_width = custom_width || 600.mm
          bot_params[:drawer_str] = "#{drawer_width.to_mm.to_i}"
          bot_params[:bot_door_seq] = ''
          bot_params[:target_total_width] = drawer_width
          bot_params[:bot_drawer_count] = custom_drawers
          bot_params[:bot_sink_cab] = 'no'
          bot_params[:bot_cocker_unit] = 'no'
          create_bottom_cabinets(bot_params)
          UI.messagebox("✓ Bottom Drawer Unit (#{drawer_width.to_l}, #{custom_drawers} drawers) Created!")
        when 'two_door_bottom'
          # Create two-door bottom cabinet
          door_width = custom_width || 900.mm
          bot_params[:drawer_str] = ''
          bot_params[:bot_door_seq] = "#{door_width.to_mm.to_i}"
          bot_params[:target_total_width] = door_width
          bot_params[:bot_drawer_count] = 2
          bot_params[:bot_sink_cab] = 'no'
          bot_params[:bot_cocker_unit] = 'no'
          create_bottom_cabinets(bot_params)
          UI.messagebox("✓ Two Door Bottom Cabinet (#{door_width.to_l}) Created at origin!")
        when 'one_open'
          # Create an open rack by setting open_rack parameter
          open_rack_params = top_params.dup
          open_rack_params[:open_rack] = true
          open_rack_params[:width] = custom_width || 600.mm
          open_rack_params[:cab_index] = 1
          create_top_cabinet_at_offset(model.entities, 0.mm, open_rack_params)
          UI.messagebox("✓ One Open Rack (#{open_rack_params[:width].to_l}) Created at origin!")
        when 'sink'
          sink_width = custom_width || bot_params[:bot_sink_width] || 900.mm
          bot_z = bot_params[:bottom_z_offset] || 100.mm
          create_bottom_sink_cabinet(0.mm, sink_width, bot_params.merge({ bottom_z_offset: bot_z }))
          UI.messagebox("✓ Sink Unit (#{sink_width.to_l}) Created at origin!")
        when 'cooker_unit'
          cooker_width = custom_width || bot_params[:bot_cocker_width] || 600.mm
          bot_z = bot_params[:bottom_z_offset] || 100.mm
          create_bottom_cocker_unit(0.mm, cooker_width, bot_params.merge({ bottom_z_offset: bot_z }))
          UI.messagebox("✓ Cooker Unit (#{cooker_width.to_l}) Created at origin!")
        when 'cooker_hood'
          # Hood is created using create_top_cabinet_at_offset with special params
          hood_width = custom_width || top_params[:cooker_hood_width] || 900.mm
          hood_height = top_params[:height] || 720.mm
          hood_space = parse_mm(top_params[:corner_reduce].to_s) || 0.mm
          hood_h = hood_height - hood_space # Hood is shorter
          hood_depth = top_params[:depth] || 350.mm
          hood_elevation = top_params[:elevation] || 1500.mm
          # Raise hood elevation so top aligns with other top cabinets
          hood_elev = hood_elevation + (hood_height - hood_h)

          hood_grp = create_top_cabinet_at_offset(model.entities, 0.mm, {
                                                    elevation: hood_elev,
                                                    width: hood_width,
                                                    height: hood_h,
                                                    depth: hood_depth,
                                                    mat_thickness: top_params[:mat_thickness],
                                                    back_thickness: top_params[:back_thickness],
                                                    groove_depth: top_params[:groove_depth],
                                                    door_out_gap: top_params[:door_out_gap],
                                                    door_in_gap: top_params[:door_in_gap],
                                                    door_mat_thk: top_params[:door_mat_thk],
                                                    open_rack: false,
                                                    door_override: top_params[:door_override] || 0.mm,
                                                    cab_index: 1,
                                                    project_name: top_params[:project_name],
                                                    door_side_clearance: top_params[:door_side_clearance],
                                                    door_system: top_params[:door_system]
                                                  })
          hood_grp.name = "Professional Cooker Hood (#{hood_width.to_l})"

          # Add side panels - they should start at ORIGINAL elevation (not raised)
          # and extend the FULL height to align with other top cabinets
          hood_params = {
            elevation: hood_elevation,  # Use original elevation, not raised hood_elev
            height: hood_height,        # Use full height, not shortened hood_h
            width: hood_width,
            interior_depth: hood_depth
          }
          create_cooker_hood_side_panels(model.entities, 0.mm, hood_params)
          UI.messagebox("✓ Professional Cooker Hood (#{hood_width.to_l}) with Side Panels Created at origin!")
        when 'corner_top'
          corner_width = custom_width || top_params[:top_corner_width] || 750.mm
          create_top_corner_cabinet(0.mm, corner_width, top_params)
          UI.messagebox("✓ Top Corner Unit (#{corner_width.to_l}) Created at origin!")
        when 'corner_bottom'
          corner_width = custom_width || 900.mm
          create_enhanced_corner_cabinet(0.mm, corner_width, bot_params)
          UI.messagebox("✓ Bottom Corner Unit (#{corner_width.to_l}) Created at origin!")
        when 'tall'
          tall_enabled = form['enable_tall'] == true &&
                         tall_params[:total_height] &&
                         tall_params[:total_height] > 0 &&
                         tall_params[:cabinet_width] &&
                         tall_params[:cabinet_width] > 0
          if tall_enabled
            tall_params[:x_position] = 0.mm # Place at origin for shotgun
            create_tall_cabinet(tall_params)
            tall_w = tall_params[:cabinet_width] || 450.mm
            UI.messagebox("✓ Tall Unit (#{tall_w.to_l}) Created at origin!")
          else
            UI.messagebox("Tall unit is not enabled! Please:\n1. Check 'Enable Tall Unit' in Tall tab\n2. Set Cabinet Width and Total Height")
          end
        end
        model.commit_operation
        next # Exit callback after shotgun creation
      end

      # ==================================================================
      # SETUP: Calculate positions FIRST, then create in order
      # ==================================================================

      global_corner_position = form['global_corner_position'] || 'right'
      wall_length = form['wall_length'] || 3600.mm

      # Get unit dimensions
      tall_enabled = form['enable_tall'] == true &&
                     tall_params[:total_height] &&
                     tall_params[:total_height] > 0 &&
                     tall_params[:cabinet_width] &&
                     tall_params[:cabinet_width] > 0

      tall_width = tall_enabled ? tall_params[:cabinet_width] : 0.mm

      # Calculate positions based on corner setting
      tall_x_position = 0.mm
      offset_for_others = 0.mm

      if global_corner_position.downcase == 'left'
        # CORNER LEFT: Corner at 0, Tall at END
        if tall_enabled
          tall_x_position = wall_length - tall_width # Tall at far right
        end
        offset_for_others = 0.mm # Bottom starts at 0
      elsif tall_enabled
        # CORNER RIGHT: Tall at 0, Corner at END
        tall_x_position = 0.mm # Tall at origin
        offset_for_others = tall_width
      else
        offset_for_others = 0.mm
      end

      # CREATE TALL UNIT NOW (before any rows) with calculated position
      if tall_enabled
        tall_params[:x_position] = tall_x_position
        create_tall_cabinet(tall_params)
        creation_summary = [] # Initialize summary
        creation_summary << "✓ Tall Unit at X=#{tall_x_position.to_l}, width: #{tall_width.to_l}"
      else
        creation_summary = []
      end

      if form['enable_top']
        # ==================================================================
        # TOP ROW GENERATION (Tall already created above)
        # ==================================================================

        # STEP 1: Determine what corner unit we need
        top_corner_enabled = form['enable_top_corner'] == true
        corner_position = global_corner_position

        # STEP 2: Calculate corner width
        corner_width = top_corner_enabled ? (top_params[:top_corner_width] || 750.mm) : 0.mm

        # STEP 3: Parse requested box widths
        box_str = top_params[:box_widths_str] || ''
        rack_str = top_params[:rack_widths_str] || ''
        requested_boxes = box_str.strip.empty? ? [] : box_str.split(',').map { |w| w.to_f.mm }
        requested_racks = rack_str.strip.empty? ? [] : rack_str.split(',').map { |w| w.to_f.mm }

        # STEP 4: Check if cooker hood is requested
        cooker_enabled = (top_params[:corner_answer].to_s.strip.downcase == 'yes')
        # Cooker footprint = MAX(hood_width, cooker_unit_width) since they stack vertically
        cooker_hood_w = cooker_enabled ? (top_params[:cooker_hood_width] || 600.mm) : 0.mm
        cooker_unit_w = cooker_enabled ? (top_params[:cooker_unit_width] || 600.mm) : 0.mm
        cooker_width = cooker_enabled ? [cooker_hood_w, cooker_unit_w].max : 0.mm

        # STEP 5: Parse open rack configuration
        open_rack_position = top_params[:open_rack_position] || 'none'
        open_rack_widths = requested_racks.sum

        # STEP 6: Calculate total requested width
        # Open racks are placed next to cooker, so include them in calculation
        total_boxes_width = requested_boxes.sum + cooker_width
        total_boxes_width += open_rack_widths if open_rack_position != 'none' && cooker_enabled
        total_requested = tall_width + corner_width + total_boxes_width
        total_wall_length = top_params[:wall_length]

        # Track what was created for final summary
        creation_summary = [] if creation_summary.nil?

        # STEP 7: SMART FITTING - If exceeds, remove smallest boxes until it fits
        if total_requested > total_wall_length
          shortage = total_requested - total_wall_length

          # Corner, tall, and cooker (+open racks if next to cooker) are CRITICAL - never remove them
          # Remove smallest regular boxes first until it fits

          # Calculate critical width (items we won't remove)
          critical_width = tall_width + corner_width + cooker_width
          if open_rack_position != 'none' && cooker_enabled
            critical_width += open_rack_widths # Open racks are critical when placed next to cooker
          end

          # Only regular boxes can be removed
          if requested_boxes.empty?
            # No boxes to remove, can't fit
            UI.messagebox(
              "❌ CRITICAL ERROR: Cannot fit tall (#{tall_width.to_l}) + corner (#{corner_width.to_l}) + cooker (#{cooker_width.to_l}) + open racks (#{open_rack_widths.to_l}) in wall length #{total_wall_length.to_l}!\n\n" +
              "Total needed: #{total_requested.to_l}\n" +
              "Exceeds by: #{shortage.to_l}\n\n" +
              'Please increase wall length or disable some units.',
              MB_OK
            )
            # Skip top row creation
          else
            # Remove smallest boxes until it fits
            removed_boxes = []
            remaining_boxes = requested_boxes.sort.reverse # Start with largest (keep largest)

            while (critical_width + remaining_boxes.sum) > total_wall_length && !remaining_boxes.empty?
              removed = remaining_boxes.pop # Remove smallest
              removed_boxes << removed
            end

            # Update requested boxes

            total_boxes_width = remaining_boxes.sum + cooker_width
            total_boxes_width += open_rack_widths if open_rack_position != 'none' && cooker_enabled
            total_requested = tall_width + corner_width + total_boxes_width

            creation_summary << "⚠️  WARNING: Removed #{removed_boxes.length} smallest boxes to fit (total #{removed_boxes.sum.to_l} removed)"
            creation_summary << "   Removed boxes: #{removed_boxes.map { |w| w.to_l }.join(', ')}"
          end
        end

        # STEP 7: Create units if validation passed or was auto-fixed
        if total_requested <= total_wall_length
          available_for_boxes = total_wall_length - tall_width - corner_width

          # Adjust bottom row width to account for tall unit
          bot_params[:target_total_width] -= tall_width if tall_enabled

          # STEP 8: Create corner and boxes (Tall already created)
          current_x = offset_for_others

          if corner_position.downcase == 'left'
            # CORNER LEFT: Create Corner at 0, then Boxes (stop before tall)

            # 8A: Create left corner at X=0
            if top_corner_enabled
              top_corner_params = {
                elevation: top_params[:elevation],
                depth: top_params[:depth],
                height: top_params[:height],
                mat_thickness: top_params[:mat_thickness],
                back_thickness: top_params[:back_thickness],
                groove_depth: top_params[:groove_depth],
                corner_depth_adjust: top_params[:corner_depth_adjust],
                bot_corner_blind_side: 'left',
                project_name: project_name,
                door_system: door_system,
                absorbed_gap: 0.mm
              }
              create_top_corner_cabinet(current_x, corner_width, top_corner_params)
              current_x += corner_width
              creation_summary << "✓ Top Corner (LEFT) at X=0, width: #{corner_width.to_l}"
            end

            # 8B: Create boxes - available space is from corner end to tall start
            # Tall is at tall_x_position, so boxes can fill: current_x to tall_x_position
            boxes_available = if tall_enabled
                                tall_x_position - current_x # Space between corner end and tall start
                              else
                                wall_length - current_x # No tall, use full remaining space
                              end

            top_params[:start_x] = current_x
            top_params[:wall_length] = boxes_available
            create_top_cabinets(top_params)
            creation_summary << "✓ Top Boxes from X=#{current_x.to_l} to X=#{(current_x + boxes_available).to_l}"

            # NOTE: Tall already created at tall_x_position

          else
            # CORNER RIGHT: Tall at 0 (already created), then Boxes, then Corner at END

            # 8A: Skip tall space (already created at X=0)
            current_x = tall_width

            # 8B: Create boxes - available space from tall end to where corner will go
            boxes_available = available_for_boxes
            top_params[:start_x] = current_x
            top_params[:wall_length] = boxes_available
            create_top_cabinets(top_params)
            used_length = top_params[:used_length] || boxes_available
            final_gap = top_params[:final_gap] || 0.mm
            current_x += used_length

            # 8C: Create right corner at END
            if top_corner_enabled
              corner_final_width = corner_width + final_gap
              top_corner_params = {
                elevation: top_params[:elevation],
                depth: top_params[:depth],
                height: top_params[:height],
                mat_thickness: top_params[:mat_thickness],
                back_thickness: top_params[:back_thickness],
                groove_depth: top_params[:groove_depth],
                corner_depth_adjust: top_params[:corner_depth_adjust],
                bot_corner_blind_side: 'right',
                project_name: project_name,
                door_system: door_system,
                absorbed_gap: final_gap
              }
              create_top_corner_cabinet(current_x, corner_final_width, top_corner_params)
              current_x += corner_final_width
              creation_summary << "✓ Top Corner (RIGHT) at X=#{(current_x - corner_final_width).to_l}, width: #{corner_final_width.to_l}"
            end
          end

          creation_summary << '✓ Top Row Complete'
        end
      end

      if form['enable_bottom']
        # BOTTOM ROW GENERATION
        # Must respect tall unit position and not pass through it

        bot_corner_enabled = form['enable_corner'] == true
        corner_width_bot = bot_corner_enabled ? (bot_params[:bot_corner_width] || 750.mm) : 0.mm

        # Bottom row starts at offset_for_others
        current_x_bot = offset_for_others

        if corner_position.downcase == 'left'
          # CORNER LEFT MODE: [Corner at 0] [Boxes] [Stop before tall at END]

          # Create corner at X=0
          if bot_corner_enabled
            bot_corner_params = bot_params.merge({
                                                   bot_corner_blind_side: 'left'
                                                 })
            create_enhanced_corner_cabinet(current_x_bot, corner_width_bot, bot_corner_params)
            current_x_bot += corner_width_bot
          end

          # Create bottom cabinets - MUST stop before tall unit
          available_width = if tall_enabled
                              # Calculate space: from current position to where tall starts
                              tall_x_position - current_x_bot
                            else
                              # No tall unit, use remaining wall length
                              wall_length - current_x_bot
                            end

          bot_params[:start_x] = current_x_bot
          bot_params[:target_total_width] = available_width
          create_bottom_cabinets(bot_params)
          creation_summary << "✓ Bottom Row (LEFT): Corner + Boxes from X=0 to X=#{(current_x_bot + available_width).to_l}"

        else
          # CORNER RIGHT MODE: [Skip tall space] [Boxes] [Corner at END]
          # current_x_bot already at tall_width (offset_for_others)

          # Calculate available space: from tall end to wall end, minus corner
          available_width = wall_length - current_x_bot - corner_width_bot

          bot_params[:start_x] = current_x_bot
          bot_params[:target_total_width] = available_width
          filler_width = create_bottom_cabinets(bot_params)

          # Create corner at END
          if bot_corner_enabled
            # Calculate corner position (after boxes, accounting for filler)
            corner_x = current_x_bot + available_width - (filler_width || 0.mm)
            adjusted_corner_width = corner_width_bot + (filler_width || 0.mm)

            bot_corner_params = bot_params.merge({
                                                   bot_corner_blind_side: 'right',
                                                   absorbed_gap: filler_width || 0.mm
                                                 })
            create_enhanced_corner_cabinet(corner_x, adjusted_corner_width, bot_corner_params)
            creation_summary << "✓ Bottom Corner (RIGHT) at X=#{corner_x.to_l}"
          end

          creation_summary << '✓ Bottom Row Complete'
        end
      end

      # Create plinth cover geometry
      create_plinth_covers_geometry
      creation_summary << '✓ Plinth Covers Created'

      model.commit_operation

      # SHOW SINGLE COMPREHENSIVE SUMMARY
      summary_text = "=== CABINET CREATION SUMMARY ===\n\n"
      summary_text += "Wall Length: #{wall_length.to_l}\n"
      summary_text += "Corner Position: #{global_corner_position.upcase}\n\n"

      creation_summary.each do |line|
        summary_text += if line.start_with?('✓')
                          line + "\n"
                        elsif line.start_with?('⚠️')
                          "\n" + line + "\n"
                        else
                          '  ' + line + "\n"
                        end
      end

      summary_text += "\n✓ All cabinets created successfully!"

      UI.messagebox(summary_text, MB_OK, 'Creation Complete')

      # Self-check: verify groups exist, and re-run missing modules if necessary (1 attempt)
      begin
        verify_and_rerun_if_missing(top_params, bot_params, tall_params, 1)
      rescue StandardError => e
        puts "Verification error: #{e.message}"
      end
    end

    dlg.add_action_callback('export_part_list') do |_ctx, _|
      export_part_list_to_csv
    end

    dlg.show
  end

  # ----------------------------------------------------------------------
  #                     BOTTOM CABINET METHODS
  # ----------------------------------------------------------------------
  # All bottom geometry is shifted upward by 100 mm.
  def self.create_bottom_cabinets(params)
    x_offset         = params[:start_x] || 0.mm
    bottom_z_offset  = params[:bottom_z_offset] || 100.mm
    depth            = params[:depth]
    height           = params[:height]
    panel_thk        = params[:panel_thk]
    back_panel_thk   = params[:back_thk]
    plinth           = params[:plinth]
    shelf_count_for_doors = params[:shelf_count_for_doors]
    groove_depth     = params[:groove_depth]
    door_gap         = params[:door_gap]
    door_side_clear  = params[:door_side_clearance]
    edge_band_thk    = params[:edge_band_thk] || params[:edge_band_thickness] || 0.mm
    face_mat_thk     = params[:face_mat_thk] || 3.mm

    target_total_width = params[:target_total_width]
    drawer_str        = params[:drawer_str].to_s
    user_drawer_count = params[:bot_drawer_count]
    door_seq_str      = params[:bot_door_seq].to_s
    project_name      = params[:project_name] || ''
    prefix            = project_name.empty? ? '' : "#{project_name} - "
    door_system       = params[:door_system] || 'handled'

    # Sink Cabinet option
    sink_answer = params[:bot_sink_cab].to_s.strip.downcase
    sink_width  = params[:bot_sink_width] || 0.mm
    if sink_answer == 'yes' && sink_width > 0
      create_bottom_sink_cabinet(x_offset, sink_width, params.merge({ bottom_z_offset: bottom_z_offset }))
      x_offset += sink_width
      target_total_width -= sink_width
    end

    # Cocker Unit option
    cocker_answer = params[:bot_cocker_unit].to_s.strip.downcase
    cocker_width  = params[:bot_cocker_width] ? params[:bot_cocker_width].to_f.mm : 600.mm
    if cocker_answer == 'yes' && cocker_width > 0
      create_bottom_cocker_unit(x_offset, cocker_width, params.merge({ bottom_z_offset: bottom_z_offset }))
      x_offset += cocker_width
      target_total_width -= cocker_width
    end

    drawer_widths = drawer_str.strip.empty? ? [] : drawer_str.split(',').map { |w| w.to_f.mm }
    door_sequence = door_seq_str.strip.empty? ? [] : door_seq_str.split(',').map { |w| w.to_f.mm }

    user_drawer_count = 2 if user_drawer_count < 2
    user_drawer_count = 3 if user_drawer_count > 3

    sum_drawers = drawer_widths.sum
    sum_doors   = door_sequence.sum
    remainder   = target_total_width - (sum_drawers + sum_doors)
    remainder   = 0 if remainder < 0

    auto_door_units  = fill_door_units_for_bottom(remainder)
    final_door_units = door_sequence + auto_door_units

    final_widths = []
    final_types  = []

    drawer_widths.each do |dw|
      final_widths << dw
      final_types  << 'drawer'
    end
    final_door_units.each do |dw|
      if dw < 0
        final_widths << -dw
        final_types  << 'filler'
      else
        final_widths << dw
        final_types  << 'door'
      end
    end

    model = Sketchup.active_model
    ents  = model.active_entities

    # Track filler width to return (so corner cabinet can absorb it)
    filler_width_to_return = 0.mm

    final_widths.each_with_index do |cab_w, idx|
      box_num = idx + 1
      typ = final_types[idx]

      if typ == 'filler'
        # Don't create filler - save its width to be absorbed by corner cabinet
        filler_width_to_return = cab_w
        next
      end

      c_grp = ents.add_group
      c_grp.transformation = Geom::Transformation.new([x_offset, -depth, bottom_z_offset])

      # Bottom Panel
      bot_grp = c_grp.entities.add_group
      f_bot = bot_grp.entities.add_face([0, 0, 0],
                                        [cab_w, 0, 0],
                                        [cab_w, depth, 0],
                                        [0, depth, 0])
      f_bot.pushpull(-panel_thk)
      bot_grp.name = "#{prefix}Bottom Box #{box_num} - Bottom Panel"

      # Left Panel
      left_grp = c_grp.entities.add_group
      f_left = left_grp.entities.add_face([0, 0, panel_thk],
                                          [panel_thk, 0, panel_thk],
                                          [panel_thk, depth, panel_thk],
                                          [0, depth, panel_thk])
      f_left.pushpull(height - plinth - panel_thk)
      left_grp.name = "#{prefix}Bottom Box #{box_num} - Left Panel"

      # Right Panel
      right_grp = c_grp.entities.add_group
      f_right = right_grp.entities.add_face([cab_w - panel_thk, 0, panel_thk],
                                            [cab_w, 0, panel_thk],
                                            [cab_w, depth, panel_thk],
                                            [cab_w - panel_thk, depth, panel_thk])
      f_right.pushpull(height - plinth - panel_thk)
      right_grp.name = "#{prefix}Bottom Box #{box_num} - Right Panel"

      # Front Stretcher
      sw = cab_w - 2 * panel_thk
      s_depth = 100.mm
      s_z = height - plinth
      front_grp = c_grp.entities.add_group
      f_front = front_grp.entities.add_face([panel_thk, 26.mm, s_z],
                                            [panel_thk + sw, 26.mm, s_z],
                                            [panel_thk + sw, 26.mm + s_depth, s_z],
                                            [panel_thk, 26.mm + s_depth, s_z])
      f_front.pushpull(-panel_thk)
      front_grp.name = "#{prefix}Bottom Box #{box_num} - Front Stretcher"

      # Back Stretcher
      back_grp = c_grp.entities.add_group
      f_back = back_grp.entities.add_face([panel_thk, depth - s_depth, s_z],
                                          [panel_thk + sw, depth - s_depth, s_z],
                                          [panel_thk + sw, depth, s_z],
                                          [panel_thk, depth, s_z])
      f_back.pushpull(-panel_thk)
      back_grp.name = "#{prefix}Bottom Box #{box_num} - Back Stretcher"

      # Back Panel
      bw = cab_w - 2 * panel_thk + 2 * groove_depth
      bh = height - plinth - 2 * panel_thk + 2 * groove_depth
      bx = panel_thk - groove_depth
      by = depth - back_panel_thk - panel_thk
      back_p_grp = c_grp.entities.add_group
      f_bp = back_p_grp.entities.add_face([bx, by, panel_thk - groove_depth],
                                          [bx + bw, by, panel_thk - groove_depth],
                                          [bx + bw, by, panel_thk - groove_depth + bh],
                                          [bx, by, panel_thk - groove_depth + bh])
      f_bp.pushpull(-back_panel_thk)
      back_p_grp.name = "#{prefix}Bottom Box #{box_num} - Back Panel"

      # Back Stretchers (100mm tall Z-axis, carcase_thk deep Y-axis)
      # Position at wall (Y = depth) and pushpull FORWARD (positive direction) toward front
      stretcher_height = 100.mm
      stretcher_width = cab_w - 2 * panel_thk # Between side panels
      stretcher_depth = panel_thk # Carcase thickness depth
      stretcher_y = depth # At wall position

      # Bottom back stretcher (sits flush on bottom panel)
      bottom_stretcher_grp = c_grp.entities.add_group
      f_bs_bot = bottom_stretcher_grp.entities.add_face([panel_thk, stretcher_y, panel_thk],
                                                        [panel_thk + stretcher_width, stretcher_y, panel_thk],
                                                        [panel_thk + stretcher_width, stretcher_y,
                                                         panel_thk + stretcher_height],
                                                        [panel_thk, stretcher_y, panel_thk + stretcher_height])
      f_bs_bot.pushpull(stretcher_depth) # Positive = push forward toward front
      bottom_stretcher_grp.name = "#{prefix}Bottom Box #{box_num} - Bottom Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

      # Top back stretcher (positioned UNDER the top panel/stretcher)
      top_stretcher_z = height - plinth - panel_thk - stretcher_height # Under top panel
      top_stretcher_grp = c_grp.entities.add_group
      f_bs_top = top_stretcher_grp.entities.add_face([panel_thk, stretcher_y, top_stretcher_z],
                                                     [panel_thk + stretcher_width, stretcher_y, top_stretcher_z],
                                                     [panel_thk + stretcher_width, stretcher_y,
                                                      top_stretcher_z + stretcher_height],
                                                     [panel_thk, stretcher_y, top_stretcher_z + stretcher_height])
      f_bs_top.pushpull(stretcher_depth) # Positive = push forward toward front
      top_stretcher_grp.name = "#{prefix}Bottom Box #{box_num} - Top Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

      if typ == 'door'
        # Only add Gola cuts if door system is "gola"
        if door_system == 'gola'
          l_bottom = height - plinth - 59.mm
          l_top = height - plinth
          flg = left_grp.entities.add_face([0, 0, l_bottom],
                                           [panel_thk, 0, l_bottom],
                                           [panel_thk, 0, l_top],
                                           [0, 0, l_top])
          flg.pushpull(-26.mm)
          left_grp.name += ' + L Gola'

          frg = right_grp.entities.add_face([cab_w - panel_thk, 0, l_bottom],
                                            [cab_w, 0, l_bottom],
                                            [cab_w, 0, l_top],
                                            [cab_w - panel_thk, 0, l_top])
          frg.pushpull(-26.mm)
          right_grp.name += ' + L Gola'
        end

        internal_open = height - plinth - panel_thk
        if shelf_count_for_doors > 0
          (1..shelf_count_for_doors).each do |s|
            shelf_grp = c_grp.entities.add_group
            sz = panel_thk + (internal_open * s / (shelf_count_for_doors + 1))
            sd = depth - back_panel_thk - panel_thk
            fs_shelf = shelf_grp.entities.add_face([panel_thk, 0, sz],
                                                   [cab_w - panel_thk, 0, sz],
                                                   [cab_w - panel_thk, sd, sz],
                                                   [panel_thk, sd, sz])
            fs_shelf.pushpull(-panel_thk)
            shelf_grp.name = "#{prefix}Bottom Box #{box_num} - Shelf #{s}"
          end
        end

        door_ht = height - plinth
        # Use 10mm gap for handled system, 30mm for gola system
        top_gap = door_system == 'gola' ? 30.mm : 10.mm
        adjusted_door_ht = door_ht - top_gap
        avail_door = cab_w - 2 * door_side_clear
        if cab_w < 599.5.mm
          door_grp = c_grp.entities.add_group
          fd = door_grp.entities.add_face([door_side_clear, 0, edge_band_thk],
                                          [door_side_clear + avail_door, 0, edge_band_thk],
                                          [door_side_clear + avail_door, 0, adjusted_door_ht - edge_band_thk],
                                          [door_side_clear, 0, adjusted_door_ht - edge_band_thk])
          fd.pushpull(face_mat_thk)
          door_grp.name = "#{prefix}Bottom Box #{box_num} - Single Door"
        else
          total_door = avail_door - door_gap
          half_door = total_door / 2.0
          [[0, 'Left Door'], [half_door + door_gap, 'Right Door']].each do |(dx, name)|
            door_grp = c_grp.entities.add_group
            fd = door_grp.entities.add_face([door_side_clear + dx, 0, edge_band_thk],
                                            [door_side_clear + dx + half_door, 0, edge_band_thk],
                                            [door_side_clear + dx + half_door, 0, adjusted_door_ht - edge_band_thk],
                                            [door_side_clear + dx, 0, adjusted_door_ht - edge_band_thk])
            fd.pushpull(face_mat_thk)
            door_grp.name = "#{prefix}Bottom Box #{box_num} - #{name}"
          end
        end
      else
        # Drawer logic
        door_ht = height - plinth
        # Use 10mm gap for handled system, 30mm for gola system
        top_gap = door_system == 'gola' ? 30.mm : 10.mm
        b_val   = edge_band_thk
        mid_z   = (door_ht + b_val) / 2.0

        # Use door_gap for handled system, or fixed values for Gola
        drawer_vertical_gap = door_system == 'gola' ? 13.mm : (door_gap / 2.0)
        drawer_horizontal_gap_3 = door_system == 'gola' ? 3.mm : door_gap

        # Only add Gola cuts if door system is "gola"
        if door_system == 'gola'
          l_bottom = door_ht - 59.mm
          l_top = door_ht

          flg = left_grp.entities.add_face([0, 0, l_bottom],
                                           [panel_thk, 0, l_bottom],
                                           [panel_thk, 0, l_top],
                                           [0, 0, l_top])
          flg.pushpull(-26.mm)
          left_grp.name += ' + L Gola'

          frg = right_grp.entities.add_face([cab_w - panel_thk, 0, l_bottom],
                                            [cab_w, 0, l_bottom],
                                            [cab_w, 0, l_top],
                                            [cab_w - panel_thk, 0, l_top])
          frg.pushpull(-26.mm)
          right_grp.name += ' + L Gola'

          c_gola_half = 73.5.mm / 2.0
          c_bottom = mid_z - c_gola_half
          c_top    = mid_z + c_gola_half
          flc = left_grp.entities.add_face([0, 0, c_bottom],
                                           [panel_thk, 0, c_bottom],
                                           [panel_thk, 0, c_top],
                                           [0, 0, c_top])
          flc.pushpull(-26.mm)
          left_grp.name += ' + C Gola'

          frc = right_grp.entities.add_face([cab_w - panel_thk, 0, c_bottom],
                                            [cab_w, 0, c_bottom],
                                            [cab_w, 0, c_top],
                                            [cab_w - panel_thk, 0, c_top])
          frc.pushpull(-26.mm)
          right_grp.name += ' + C Gola'
        end

        if user_drawer_count == 2
          bottom_face_height = (mid_z - drawer_vertical_gap) - b_val
          b_grp = c_grp.entities.add_group
          fb_draw = b_grp.entities.add_face([door_side_clear, 0, b_val],
                                            [cab_w - door_side_clear, 0, b_val],
                                            [cab_w - door_side_clear, 0, b_val + bottom_face_height],
                                            [door_side_clear, 0, b_val + bottom_face_height])
          fb_draw.pushpull(face_mat_thk)
          b_grp.name = "#{prefix}Bottom Drawer Face"

          top_face_z = mid_z + drawer_vertical_gap
          top_face_height = (door_ht - top_gap) - top_face_z
          t_grp = c_grp.entities.add_group
          ft_draw = t_grp.entities.add_face([door_side_clear, 0, top_face_z],
                                            [cab_w - door_side_clear, 0, top_face_z],
                                            [cab_w - door_side_clear, 0, top_face_z + top_face_height],
                                            [door_side_clear, 0, top_face_z + top_face_height])
          ft_draw.pushpull(face_mat_thk)
          t_grp.name = "#{prefix}Top Drawer Face"
        else
          bottom_face_height = (mid_z - drawer_vertical_gap) - b_val
          b_grp = c_grp.entities.add_group
          fb_draw = b_grp.entities.add_face([door_side_clear, 0, b_val],
                                            [cab_w - door_side_clear, 0, b_val],
                                            [cab_w - door_side_clear, 0, b_val + bottom_face_height],
                                            [door_side_clear, 0, b_val + bottom_face_height])
          fb_draw.pushpull(face_mat_thk)
          b_grp.name = "#{prefix}Bottom Drawer Face"

          top_face_z = mid_z + drawer_vertical_gap
          top_region_height = (door_ht - top_gap) - top_face_z
          half_h = (top_region_height - drawer_horizontal_gap_3) / 2.0
          top1_grp = c_grp.entities.add_group
          f1 = top1_grp.entities.add_face([door_side_clear, 0, top_face_z],
                                          [cab_w - door_side_clear, 0, top_face_z],
                                          [cab_w - door_side_clear, 0, top_face_z + half_h],
                                          [door_side_clear, 0, top_face_z + half_h])
          f1.pushpull(face_mat_thk)
          top1_grp.name = "#{prefix}Top Drawer Face 1"
          top_face2_z = top_face_z + half_h + drawer_horizontal_gap_3
          top2_grp = c_grp.entities.add_group
          f2 = top2_grp.entities.add_face([door_side_clear, 0, top_face2_z],
                                          [cab_w - door_side_clear, 0, top_face2_z],
                                          [cab_w - door_side_clear, 0, top_face2_z + half_h],
                                          [door_side_clear, 0, top_face2_z + half_h])
          f2.pushpull(face_mat_thk)
          top2_grp.name = "#{prefix}Top Drawer Face 2"
        end
      end

      x_offset += cab_w
      c_grp.name = "#{prefix}Bottom Box #{box_num} - #{typ.capitalize} (#{cab_w.to_l} mm)"
    end

    # Return filler width so corner cabinet can absorb it
    filler_width_to_return
  end

  # ----------------------------------------------------------------------
  #         ENHANCED CORNER CABINET WITH SHELF, UPRIGHT, AND CUTOUT
  # ----------------------------------------------------------------------
  # Helper functions for corner cabinet
  def self.rect_extrude_group(ents, origin, w, d, thk, name)
    g = ents.add_group
    g.name = name
    f = g.entities.add_face([origin.x,        origin.y,        origin.z],
                            [origin.x + w,    origin.y,        origin.z],
                            [origin.x + w,    origin.y + d,    origin.z],
                            [origin.x,        origin.y + d,    origin.z])
    f.reverse! if f.normal.z < 0
    f.pushpull(thk)
    g
  end

  def self.cut_notch!(grp, x, y, z, notch_w, notch_d, depth)
    return if grp.nil?
    return if depth.nil? || depth <= 0
    return if notch_w.nil? || notch_d.nil? || notch_w <= 0 || notch_d <= 0

    depth = depth.abs
    f = grp.entities.add_face([x, y, z],
                              [x + notch_w,  y, z],
                              [x + notch_w,  y + notch_d, z],
                              [x, y + notch_d, z])
    f.reverse! if f.normal.z < 0
    f.pushpull(-depth)
  end

  def self.pushpull_towards_negative_y!(face, dist_mm)
    face.reverse! if face.normal.y > 0
    face.pushpull(dist_mm)
  end

  def self.create_enhanced_corner_cabinet(x_offset, cab_w, params)
    model = Sketchup.active_model
    ents  = model.active_entities
    project_name    = params[:project_name] || ''
    prefix          = project_name.empty? ? '' : "#{project_name} - "
    door_system     = params[:door_system] || 'handled'

    # Extract all necessary params from the main hash
    bottom_z_offset = params[:bottom_z_offset] || 100.mm
    depth           = params[:depth]
    height          = params[:height]
    panel_thk       = params[:panel_thk]
    back_panel_thk  = params[:back_thk]
    plinth          = params[:plinth]
    groove_depth    = params[:groove_depth]
    door_gap        = params[:door_gap]
    door_side_clear = params[:door_side_clearance]
    edge_band_thk   = params[:edge_band_thickness]
    face_mat_thk    = params[:face_mat_thk]
    params[:door_thickness] || params[:door_thk] || 18.mm

    # --- Blind Corner Cabinet Specific Logic ---
    blind_side = params[:bot_corner_blind_side] || 'right' # Default to right
    blind_panel_width = params[:bot_corner_blind_width] || 625.mm
    door_width = cab_w - blind_panel_width

    # Create the main group for the corner cabinet
    grp = ents.add_group
    grp.transformation = Geom::Transformation.new([x_offset, -depth, bottom_z_offset])
    grp.name = "#{prefix}Enhanced Corner Cabinet - W=#{cab_w.to_l}"

    # --- Build the Carcass ---

    # Bottom Panel
    bot_grp = grp.entities.add_group
    f_bot = bot_grp.entities.add_face([0, 0, 0], [cab_w, 0, 0], [cab_w, depth, 0], [0, depth, 0])
    f_bot.pushpull(-panel_thk)
    bot_grp.name = "#{prefix}Corner Bottom Panel"

    # Left Panel
    left_grp = grp.entities.add_group
    f_left = left_grp.entities.add_face([0, 0, panel_thk], [panel_thk, 0, panel_thk], [panel_thk, depth, panel_thk],
                                        [0, depth, panel_thk])
    f_left.pushpull(height - plinth - panel_thk)
    left_grp.name = "#{prefix}Corner Left Panel"

    # Right Panel
    right_grp = grp.entities.add_group
    f_right = grp.entities.add_face([cab_w - panel_thk, 0, panel_thk], [cab_w, 0, panel_thk], [cab_w, depth, panel_thk],
                                    [cab_w - panel_thk, depth, panel_thk])
    f_right.pushpull(height - plinth - panel_thk)
    right_grp.name = "#{prefix}Corner Right Panel"

    # Front Stretcher
    sw = cab_w - 2 * panel_thk
    s_depth = 100.mm
    s_z = height - plinth
    front_grp = grp.entities.add_group
    f_front = front_grp.entities.add_face([panel_thk, 26.mm, s_z],
                                          [panel_thk + sw, 26.mm, s_z],
                                          [panel_thk + sw, 26.mm + s_depth, s_z],
                                          [panel_thk, 26.mm + s_depth, s_z])
    f_front.pushpull(-panel_thk)
    front_grp.name = "#{prefix}Corner Front Stretcher"

    # Back Stretcher
    back_grp = grp.entities.add_group
    f_back = back_grp.entities.add_face([panel_thk, depth - s_depth, s_z],
                                        [panel_thk + sw, depth - s_depth, s_z],
                                        [panel_thk + sw, depth, s_z],
                                        [panel_thk, depth, s_z])
    f_back.pushpull(-panel_thk)
    back_grp.name = "#{prefix}Corner Back Stretcher"

    # Back Panel
    bw = cab_w - 2 * panel_thk + 2 * groove_depth
    bh = height - plinth - 2 * panel_thk + 2 * groove_depth
    bx = panel_thk - groove_depth
    by = depth - back_panel_thk - panel_thk
    back_p_grp = grp.entities.add_group
    f_bp = back_p_grp.entities.add_face([bx, by, panel_thk - groove_depth],
                                        [bx + bw, by, panel_thk - groove_depth],
                                        [bx + bw, by, panel_thk - groove_depth + bh],
                                        [bx, by, panel_thk - groove_depth + bh])
    f_bp.pushpull(-back_panel_thk)
    back_p_grp.name = "#{prefix}Corner Back Panel"

    # Back Stretchers (100mm tall Z-axis, carcase_thk deep Y-axis)
    # Position at wall (Y = depth) and pushpull FORWARD (positive direction) toward front
    stretcher_height = 100.mm
    stretcher_width = cab_w - 2 * panel_thk # Between side panels
    stretcher_depth = panel_thk # Carcase thickness depth
    stretcher_y = depth # At wall position

    # Bottom back stretcher (sits flush on bottom panel)
    bottom_stretcher_grp = grp.entities.add_group
    f_bs_bot = bottom_stretcher_grp.entities.add_face([panel_thk, stretcher_y, panel_thk],
                                                      [panel_thk + stretcher_width, stretcher_y, panel_thk],
                                                      [panel_thk + stretcher_width, stretcher_y,
                                                       panel_thk + stretcher_height],
                                                      [panel_thk, stretcher_y, panel_thk + stretcher_height])
    f_bs_bot.pushpull(stretcher_depth) # Positive = push forward toward front
    bottom_stretcher_grp.name = "#{prefix}Corner Bottom Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    # Top back stretcher (positioned UNDER the top panel)
    top_stretcher_z = height - plinth - panel_thk - stretcher_height # Under top panel
    top_stretcher_grp = grp.entities.add_group
    f_bs_top = top_stretcher_grp.entities.add_face([panel_thk, stretcher_y, top_stretcher_z],
                                                   [panel_thk + stretcher_width, stretcher_y, top_stretcher_z],
                                                   [panel_thk + stretcher_width, stretcher_y,
                                                    top_stretcher_z + stretcher_height],
                                                   [panel_thk, stretcher_y, top_stretcher_z + stretcher_height])
    f_bs_top.pushpull(stretcher_depth) # Positive = push forward toward front
    top_stretcher_grp.name = "#{prefix}Corner Top Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    # --- ENHANCED FEATURES ---

    # SHELF WITH CUTOUT FOR UPRIGHT
    # Position shelf at mid-height
    internal_height = height - plinth - (2 * panel_thk)
    shelf_top_z = panel_thk + (internal_height / 2.0)
    shelf_bottom_z = shelf_top_z - panel_thk
    shelf_d = depth - back_panel_thk - panel_thk
    sw = cab_w - 2 * panel_thk

    # Determine upright position based on blind side
    upright_x = blind_side == 'right' ? door_width : blind_panel_width

    # Upright dimensions
    upright_width = panel_thk
    upright_depth = 100.mm # Door stop depth

    # Create shelf as solid group using rect_extrude_group
    shelf = rect_extrude_group(grp.entities, Geom::Point3d.new(panel_thk, 0, shelf_bottom_z),
                               sw, shelf_d, panel_thk, "#{prefix}Corner - Mid Shelf")

    # Cut notch for upright (2mm tolerance, depth matches upright depth)
    notch_tol = 2.mm
    notch_w = panel_thk + notch_tol
    notch_d = upright_depth # Notch depth matches upright depth

    # Calculate notch X position (centered on upright)
    upright_start = upright_x - (upright_width / 2.0)
    notch_x = upright_start - (notch_w - upright_width) / 2.0
    notch_x = [[notch_x, panel_thk].max, cab_w - panel_thk - notch_w].min

    # Cut the notch into the shelf
    cut_notch!(shelf, notch_x, 0, shelf_top_z, notch_w, notch_d, panel_thk)

    # UPRIGHT TO HOLD DOOR
    upright_grp = grp.entities.add_group
    upright_height = height - plinth - (2 * panel_thk)
    upright_x_pos = upright_x - (upright_width / 2.0)

    f_upright = upright_grp.entities.add_face([upright_x_pos, 0, panel_thk],
                                              [upright_x_pos + upright_width, 0, panel_thk],
                                              [upright_x_pos + upright_width, upright_depth, panel_thk],
                                              [upright_x_pos, upright_depth, panel_thk])
    f_upright.pushpull(upright_height)
    upright_grp.name = "#{prefix}Corner Door Support Upright"

    # Only add Gola cuts if door system is "gola"
    if door_system == 'gola'
      # L Gola Profile Cut
      l_bottom = height - plinth - 59.mm
      l_top = height - plinth
      flg = left_grp.entities.add_face([0, 0, l_bottom], [panel_thk, 0, l_bottom], [panel_thk, 0, l_top], [0, 0, l_top])
      flg.pushpull(-26.mm)
      left_grp.name += ' + L Gola'

      frg = right_grp.entities.add_face([cab_w - panel_thk, 0, l_bottom], [cab_w, 0, l_bottom], [cab_w, 0, l_top],
                                        [cab_w - panel_thk, 0, l_top])
      frg.pushpull(-26.mm)
      right_grp.name += ' + L Gola'
    end

    # --- Door and Blind Panel ---
    door_ht = height - plinth
    # Use 10mm gap for handled system, 30mm for gola system
    top_gap = door_system == 'gola' ? 30.mm : 10.mm
    adjusted_door_ht = door_ht - top_gap

    if blind_side == 'right'
      # Door on the LEFT, Blind Panel on the RIGHT
      # Door (split into two if wider than 500mm)
      if door_width > 0.mm
        door_actual_width = door_width - door_side_clear - (door_gap / 2.0)

        if door_actual_width > 500.mm
          # Split into two doors
          half_door_width = (door_actual_width - door_gap) / 2.0

          # Left door
          door_grp_1 = grp.entities.add_group
          fd1 = door_grp_1.entities.add_face(
            [door_side_clear, 0, edge_band_thk],
            [door_side_clear + half_door_width, 0, edge_band_thk],
            [door_side_clear + half_door_width, 0, adjusted_door_ht - edge_band_thk],
            [door_side_clear, 0, adjusted_door_ht - edge_band_thk]
          )
          fd1.pushpull(face_mat_thk)
          door_grp_1.name = "#{prefix}Corner Door 1 (Left)"

          # Right door
          door_grp_2 = grp.entities.add_group
          door2_start_x = door_side_clear + half_door_width + door_gap
          fd2 = door_grp_2.entities.add_face(
            [door2_start_x, 0, edge_band_thk],
            [door2_start_x + half_door_width, 0, edge_band_thk],
            [door2_start_x + half_door_width, 0, adjusted_door_ht - edge_band_thk],
            [door2_start_x, 0, adjusted_door_ht - edge_band_thk]
          )
          fd2.pushpull(face_mat_thk)
          door_grp_2.name = "#{prefix}Corner Door 2 (Left)"
        else
          # Single door
          door_grp = grp.entities.add_group
          fd = door_grp.entities.add_face(
            [door_side_clear, 0, edge_band_thk],
            [door_side_clear + door_actual_width, 0, edge_band_thk],
            [door_side_clear + door_actual_width, 0, adjusted_door_ht - edge_band_thk],
            [door_side_clear, 0, adjusted_door_ht - edge_band_thk]
          )
          fd.pushpull(face_mat_thk)
          door_grp.name = "#{prefix}Corner Door (Left)"
        end
      end

      # Blind Panel
      blind_start_x = door_width + (door_gap / 2.0)

      blind_grp = grp.entities.add_group
      fb = blind_grp.entities.add_face(
        [blind_start_x, 0, edge_band_thk],
        [cab_w - door_side_clear, 0, edge_band_thk],
        [cab_w - door_side_clear, 0, adjusted_door_ht - edge_band_thk],
        [blind_start_x, 0, adjusted_door_ht - edge_band_thk]
      )
      fb.pushpull(face_mat_thk)
      blind_grp.name = "#{prefix}Corner Blind Panel (Right)"
    else # blind_side == 'left'
      # Blind Panel on the LEFT, Door on the RIGHT
      # Blind Panel
      blind_actual_width = blind_panel_width - door_side_clear - (door_gap / 2.0)
      blind_grp = grp.entities.add_group
      fb = blind_grp.entities.add_face(
        [door_side_clear, 0, edge_band_thk],
        [door_side_clear + blind_actual_width, 0, edge_band_thk],
        [door_side_clear + blind_actual_width, 0, adjusted_door_ht - edge_band_thk],
        [door_side_clear, 0, adjusted_door_ht - edge_band_thk]
      )
      fb.pushpull(face_mat_thk)
      blind_grp.name = "#{prefix}Corner Blind Panel (Left)"

      # Door (split into two if wider than 500mm)
      if door_width > 0.mm
        door_start_x = blind_panel_width + (door_gap / 2.0)
        door_actual_width = door_width - door_side_clear - (door_gap / 2.0)

        if door_actual_width > 500.mm
          # Split into two doors
          half_door_width = (door_actual_width - door_gap) / 2.0

          # Left door
          door_grp_1 = grp.entities.add_group
          fd1 = door_grp_1.entities.add_face(
            [door_start_x, 0, edge_band_thk],
            [door_start_x + half_door_width, 0, edge_band_thk],
            [door_start_x + half_door_width, 0, adjusted_door_ht - edge_band_thk],
            [door_start_x, 0, adjusted_door_ht - edge_band_thk]
          )
          fd1.pushpull(face_mat_thk)
          door_grp_1.name = "#{prefix}Corner Door 1 (Right)"

          # Right door
          door_grp_2 = grp.entities.add_group
          door2_start_x = door_start_x + half_door_width + door_gap
          fd2 = door_grp_2.entities.add_face(
            [door2_start_x, 0, edge_band_thk],
            [cab_w - door_side_clear, 0, edge_band_thk],
            [cab_w - door_side_clear, 0, adjusted_door_ht - edge_band_thk],
            [door2_start_x, 0, adjusted_door_ht - edge_band_thk]
          )
          fd2.pushpull(face_mat_thk)
          door_grp_2.name = "#{prefix}Corner Door 2 (Right)"
        else
          # Single door
          door_grp = grp.entities.add_group
          fd = door_grp.entities.add_face(
            [door_start_x, 0, edge_band_thk],
            [cab_w - door_side_clear, 0, edge_band_thk],
            [cab_w - door_side_clear, 0, adjusted_door_ht - edge_band_thk],
            [door_start_x, 0, adjusted_door_ht - edge_band_thk]
          )
          fd.pushpull(face_mat_thk)
          door_grp.name = "#{prefix}Corner Door (Right)"
        end
      end
    end
  end

  # ----------------------------------------------------------------------
  #         TOP CORNER CABINET (SHELF ONLY, NO DRAWERS/DOORS)
  # ----------------------------------------------------------------------
  def self.create_top_corner_cabinet(x_offset, cab_w, params)
    model = Sketchup.active_model
    ents  = model.active_entities
    project_name    = params[:project_name] || ''
    prefix          = project_name.empty? ? '' : "#{project_name} - "
    door_system     = params[:door_system] || 'handled'
    elevation       = params[:elevation] || 1500.mm

    # Extract necessary params
    depth           = params[:depth] || 368.mm # Top unit depth
    ui_height       = params[:height] # Full UI height (for doors)
    panel_thk       = params[:mat_thickness] || 18.mm
    back_panel_thk  = params[:back_thickness] || 6.mm
    groove_depth    = params[:groove_depth] || 5.mm
    door_mat_thk    = params[:door_mat_thk] || 18.mm
    params[:door_out_gap] || 3.mm

    # Door override for gola system (carcass starts higher)
    door_override = door_system == 'gola' ? (params[:door_override] || 20.mm) : 0.mm
    carcass_offset = door_override
    effective_cab_height = ui_height - door_override # Carcass height

    # Top corner specific: blind side width = depth + 25mm (user setting for gap)
    corner_depth_adjust = 25.mm # Gap between top corner and next unit
    blind_panel_width = depth + corner_depth_adjust # 368mm + 25mm = 393mm
    shelf_depth = depth - back_panel_thk - panel_thk

    # Create the main group for the top corner cabinet (no plinth, so no bottom_z_offset)
    grp = ents.add_group
    grp.transformation = Geom::Transformation.new([x_offset, -depth, elevation])
    grp.name = "#{prefix}Top Corner Cabinet - W=#{cab_w.to_l}"

    # --- Build the Carcass ---
    # All panels start at carcass_offset (for gola system support)

    # Bottom Panel (INSIDE the side panels, sits on them like regular top cabinets)
    bot_grp = grp.entities.add_group
    f_bot = bot_grp.entities.add_face([panel_thk, 0, carcass_offset + panel_thk],
                                      [cab_w - panel_thk, 0, carcass_offset + panel_thk],
                                      [cab_w - panel_thk, depth, carcass_offset + panel_thk],
                                      [panel_thk, depth, carcass_offset + panel_thk])
    f_bot.pushpull(-panel_thk)
    bot_grp.name = "#{prefix}Top Corner Bottom Panel (Inside Sides)"

    # Left Panel - from carcass_offset extending upward
    left_grp = grp.entities.add_group
    f_left = left_grp.entities.add_face([0, 0, carcass_offset],
                                        [0, depth, carcass_offset],
                                        [0, depth, carcass_offset + effective_cab_height],
                                        [0, 0, carcass_offset + effective_cab_height])
    f_left.pushpull(panel_thk) # Positive pushpull in +X direction
    left_grp.name = "#{prefix}Top Corner Left Panel"

    # Right Panel - from carcass_offset extending upward
    right_grp = grp.entities.add_group
    f_right = grp.entities.add_face([cab_w, 0, carcass_offset],
                                    [cab_w, depth, carcass_offset],
                                    [cab_w, depth, carcass_offset + effective_cab_height],
                                    [cab_w, 0, carcass_offset + effective_cab_height])
    f_right.pushpull(-panel_thk) # Negative pushpull in -X direction
    right_grp.name = "#{prefix}Top Corner Right Panel"

    # Top Panel (sits BETWEEN side panels, not full width)
    top_z = carcass_offset + effective_cab_height - panel_thk
    top_grp = grp.entities.add_group
    f_top = top_grp.entities.add_face([panel_thk, 0, top_z],
                                      [cab_w - panel_thk, 0, top_z],
                                      [cab_w - panel_thk, depth, top_z],
                                      [panel_thk, depth, top_z])
    f_top.pushpull(panel_thk)
    top_grp.name = "#{prefix}Top Corner Top Panel"

    # Back Panel (nested inside top, bottom, and sides like regular top cabinets)
    bw = cab_w - 2 * panel_thk + 2 * groove_depth
    bh = effective_cab_height - 2 * panel_thk + 2 * groove_depth
    bx = panel_thk - groove_depth
    by = depth - back_panel_thk - panel_thk
    bz_start = carcass_offset + panel_thk - groove_depth # Inside bottom panel
    back_p_grp = grp.entities.add_group
    f_bp = back_p_grp.entities.add_face([bx, by, bz_start],
                                        [bx + bw, by, bz_start],
                                        [bx + bw, by, bz_start + bh],
                                        [bx, by, bz_start + bh])
    f_bp.pushpull(-back_panel_thk)
    back_p_grp.name = "#{prefix}Top Corner Back Panel"

    # Back Stretchers (same logic as regular top cabinets)
    stretcher_height = 100.mm
    stretcher_width = cab_w - 2 * panel_thk
    stretcher_depth = panel_thk # Depth of stretcher
    stretcher_y = depth # At wall position (furthest back, same as regular top cabinets)

    # Bottom back stretcher (sits ON bottom panel like regular top cabinets)
    bottom_stretcher_z = carcass_offset + panel_thk # On bottom panel (formula matches regular top cabs)
    bottom_stretcher_grp = grp.entities.add_group
    f_bs_bot = bottom_stretcher_grp.entities.add_face([panel_thk, stretcher_y, bottom_stretcher_z],
                                                      [panel_thk + stretcher_width, stretcher_y, bottom_stretcher_z],
                                                      [panel_thk + stretcher_width, stretcher_y,
                                                       bottom_stretcher_z + stretcher_height],
                                                      [panel_thk, stretcher_y, bottom_stretcher_z + stretcher_height])
    f_bs_bot.pushpull(stretcher_depth) # Positive = push forward (like regular top cabinets)
    bottom_stretcher_grp.name = "#{prefix}Top Corner - Bottom Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    # Top back stretcher (under top panel, same formula as regular top cabinets)
    top_stretcher_z = carcass_offset + effective_cab_height - panel_thk - stretcher_height
    top_stretcher_grp = grp.entities.add_group
    f_bs_top = top_stretcher_grp.entities.add_face([panel_thk, stretcher_y, top_stretcher_z],
                                                   [panel_thk + stretcher_width, stretcher_y, top_stretcher_z],
                                                   [panel_thk + stretcher_width, stretcher_y,
                                                    top_stretcher_z + stretcher_height],
                                                   [panel_thk, stretcher_y, top_stretcher_z + stretcher_height])
    f_bs_top.pushpull(stretcher_depth) # Positive = push forward (like regular top cabinets)
    top_stretcher_grp.name = "#{prefix}Top Corner - Top Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    # --- SHELF WITH CUTOUT FOR UPRIGHT (copied from bottom corner) ---
    internal_height = effective_cab_height - (2 * panel_thk) # Between bottom and top panels
    shelf_top_z = carcass_offset + panel_thk + (internal_height / 2.0) # Mid-height
    shelf_bottom_z = shelf_top_z - panel_thk
    shelf_d = shelf_depth
    shelf_w = cab_w - 2 * panel_thk

    # Determine upright position (same logic as bottom corner)
    blind_side = params[:bot_corner_blind_side] || 'right'
    door_width = cab_w - blind_panel_width
    upright_x = blind_side == 'right' ? door_width : blind_panel_width

    # Upright dimensions
    upright_width = panel_thk
    upright_depth = 100.mm # Door stop depth

    # Create shelf as solid group using rect_extrude_group (like bottom corner)
    shelf = rect_extrude_group(grp.entities, Geom::Point3d.new(panel_thk, 0, shelf_bottom_z),
                               shelf_w, shelf_d, panel_thk, "#{prefix}Top Corner - Mid Shelf")

    # Cut notch for upright (2mm tolerance, depth matches upright depth)
    notch_tol = 2.mm
    notch_w = panel_thk + notch_tol
    notch_d = upright_depth # Notch depth matches upright depth

    # Calculate notch X position (centered on upright)
    upright_start = upright_x - (upright_width / 2.0)
    notch_x = upright_start - (notch_w - upright_width) / 2.0
    notch_x = [[notch_x, panel_thk].max, cab_w - panel_thk - notch_w].min

    # Cut the notch into the shelf (using shelf_top_z as Z coordinate like bottom corner)
    cut_notch!(shelf, notch_x, 0, shelf_top_z, notch_w, notch_d, panel_thk)

    # --- UPRIGHT TO SUPPORT SHELF ---
    upright_grp = grp.entities.add_group
    upright_height = effective_cab_height - (2 * panel_thk)
    upright_x_pos = upright_x - (upright_width / 2.0)
    upright_z_start = carcass_offset + panel_thk # Start ON bottom panel

    f_upright = upright_grp.entities.add_face([upright_x_pos, 0, upright_z_start],
                                              [upright_x_pos + upright_width, 0, upright_z_start],
                                              [upright_x_pos + upright_width, upright_depth, upright_z_start],
                                              [upright_x_pos, upright_depth, upright_z_start])
    f_upright.pushpull(upright_height) # Positive pushpull goes UP
    upright_grp.name = "#{prefix}Top Corner Shelf Support Upright"

    # --- Doors and Blind Panel ---
    # Use same logic as regular top cabinets - doors go to full UI height
    door_gap = params[:door_gap] || 3.mm
    door_side_clear = params[:door_side_clearance] || 3.mm
    door_top = ui_height # Doors go to full UI height (like regular top cabinets)

    # Door opening calculation
    opening_w = door_width - 2 * door_side_clear
    opening_w = [opening_w, 0.mm].max

    # Create doors if there's an opening
    if opening_w > 0.mm
      opening_x0 = blind_side == 'right' ? door_side_clear : (blind_panel_width + door_side_clear)

      # Split into two doors if width > 749mm (user requirement for corner absorption)
      if opening_w > 749.mm && (opening_w - door_gap) > 0.mm
        leaf_w = (opening_w - door_gap) / 2.0
        if leaf_w > 0.mm
          # Left door
          door_grp_1 = grp.entities.add_group
          fd1 = door_grp_1.entities.add_face([opening_x0, 0, 0],
                                             [opening_x0 + leaf_w, 0, 0],
                                             [opening_x0 + leaf_w, 0, door_top],
                                             [opening_x0, 0, door_top])
          pushpull_towards_negative_y!(fd1, door_mat_thk)
          door_grp_1.name = "#{prefix}Top Corner - Door Leaf 1"

          # Right door
          door_grp_2 = grp.entities.add_group
          door2_x = opening_x0 + leaf_w + door_gap
          fd2 = door_grp_2.entities.add_face([door2_x, 0, 0],
                                             [door2_x + leaf_w, 0, 0],
                                             [door2_x + leaf_w, 0, door_top],
                                             [door2_x, 0, door_top])
          pushpull_towards_negative_y!(fd2, door_mat_thk)
          door_grp_2.name = "#{prefix}Top Corner - Door Leaf 2 (Auto-split >749mm)"
        end
      else
        # Single door
        door_grp = grp.entities.add_group
        fd = door_grp.entities.add_face([opening_x0, 0, 0],
                                        [opening_x0 + opening_w, 0, 0],
                                        [opening_x0 + opening_w, 0, door_top],
                                        [opening_x0, 0, door_top])
        pushpull_towards_negative_y!(fd, door_mat_thk)
        door_grp.name = "#{prefix}Top Corner - Door"
      end
    end

    # --- Blind Panel ---
    return unless blind_panel_width > 0.mm

    if blind_side == 'left'
      blind_grp = grp.entities.add_group
      fb = blind_grp.entities.add_face(
        [door_side_clear, 0, 0],
        [blind_panel_width, 0, 0],
        [blind_panel_width, 0, door_top],
        [door_side_clear, 0, door_top]
      )
      pushpull_towards_negative_y!(fb, door_mat_thk)
      blind_grp.name = "#{prefix}Top Corner Blind Panel (Left)"
    else
      # Right blind side
      blind_start_x = cab_w - blind_panel_width
      blind_grp = grp.entities.add_group
      fb = blind_grp.entities.add_face(
        [blind_start_x, 0, 0],
        [cab_w - door_side_clear, 0, 0],
        [cab_w - door_side_clear, 0, door_top],
        [blind_start_x, 0, door_top]
      )
      pushpull_towards_negative_y!(fb, door_mat_thk)
      blind_grp.name = "#{prefix}Top Corner Blind Panel (Right)"
    end
  end

  # ----------------------------------------------------------------------
  #         CUSTOM SINK CABINET FOR BOTTOM UNITS (ADVANCED MODE)
  # ----------------------------------------------------------------------
  def self.create_bottom_sink_cabinet(x_offset, cab_w, params)
    model = Sketchup.active_model
    ents  = model.active_entities
    bottom_z_offset = params[:bottom_z_offset] || 100.mm
    project_name    = params[:project_name] || ''
    prefix          = project_name.empty? ? '' : "#{project_name} - "
    door_system     = params[:door_system] || 'handled'

    depth           = params[:depth]
    height          = params[:height]
    panel_thk       = params[:panel_thk]
    plinth          = params[:plinth]
    door_gap        = params[:door_gap]
    door_side_clearance = params[:door_side_clearance]
    # Accept either naming convention and provide safe defaults
    edge_band_thk   = params[:edge_band_thk] || params[:edge_band_thickness] || 0.mm
    face_mat_thk    = params[:face_mat_thk] || 3.mm
    params[:door_thickness] || params[:door_thk] || 18.mm

    # New dimensions for sink
    top_rail_height       = 50.mm
    sink_stretcher_height = 100.mm

    c_grp = ents.add_group
    c_grp.transformation = Geom::Transformation.new([x_offset, -depth, bottom_z_offset])
    c_grp.name = "#{prefix}Bottom Box (Sink) - W=#{cab_w.to_l}"

    # Bottom Panel
    bot_grp = c_grp.entities.add_group
    f_bot = bot_grp.entities.add_face([0, 0, 0],
                                      [cab_w, 0, 0],
                                      [cab_w, depth, 0],
                                      [0, depth, 0])
    f_bot.pushpull(-panel_thk)
    bot_grp.name = "#{prefix}Sink Bottom Panel"

    # Left & Right Panels
    left_grp = c_grp.entities.add_group
    f_left = left_grp.entities.add_face([0, 0, panel_thk],
                                        [panel_thk, 0, panel_thk],
                                        [panel_thk, depth, panel_thk],
                                        [0, depth, panel_thk])
    f_left.pushpull(height - plinth - panel_thk)
    left_grp.name = "#{prefix}Sink Left Panel"

    right_grp = c_grp.entities.add_group
    f_right = right_grp.entities.add_face([cab_w - panel_thk, 0, panel_thk],
                                          [cab_w, 0, panel_thk],
                                          [cab_w, depth, panel_thk],
                                          [cab_w - panel_thk, depth, panel_thk])
    f_right.pushpull(height - plinth - panel_thk)
    right_grp.name = "#{prefix}Sink Right Panel"

    # Only add Gola cuts if door system is "gola"
    if door_system == 'gola'
      # Sink L Gola
      l_bottom = height - plinth - 59.mm
      l_top    = height - plinth
      f_lg = left_grp.entities.add_face([0, 0, l_bottom],
                                        [panel_thk, 0, l_bottom],
                                        [panel_thk, 0, l_top],
                                        [0, 0, l_top])
      f_lg.pushpull(-26.mm)
      left_grp.name += ' + L Gola'
      f_rg = right_grp.entities.add_face([cab_w - panel_thk, 0, l_bottom],
                                         [cab_w, 0, l_bottom],
                                         [cab_w, 0, l_top],
                                         [cab_w - panel_thk, 0, l_top])
      f_rg.pushpull(-26.mm)
      right_grp.name += ' + L Gola'
    end

    # Top Rails
    top_z = height - plinth
    rail_depth = panel_thk
    front_rail_grp = c_grp.entities.add_group
    rail_y = 26.mm
    f_fr = front_rail_grp.entities.add_face(
      [panel_thk, rail_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_y, top_z],
      [panel_thk, rail_y, top_z]
    )
    f_fr.pushpull(-rail_depth)
    front_rail_grp.name = "#{prefix}Sink Front Rail"

    rear_rail_grp = c_grp.entities.add_group
    rail_back_y = depth - 26.mm
    f_rr = rear_rail_grp.entities.add_face(
      [panel_thk, rail_back_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_back_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_back_y, top_z],
      [panel_thk, rail_back_y, top_z]
    )
    f_rr.pushpull(-rail_depth)
    rear_rail_grp.name = "#{prefix}Sink Rear Top Rail"

    # Back Stretcher
    s_depth = panel_thk
    bottom_stretcher_grp = c_grp.entities.add_group
    bs_z_bottom = panel_thk
    bs_z_top    = bs_z_bottom + sink_stretcher_height
    bs_x1 = panel_thk
    bs_x2 = cab_w - panel_thk
    f_bs = bottom_stretcher_grp.entities.add_face(
      [bs_x1, depth - s_depth, bs_z_bottom],
      [bs_x2, depth - s_depth, bs_z_bottom],
      [bs_x2, depth - s_depth, bs_z_top],
      [bs_x1, depth - s_depth, bs_z_top]
    )
    f_bs.pushpull(-panel_thk)
    bottom_stretcher_grp.name = "#{prefix}Sink Bottom Rear Stretcher (#{sink_stretcher_height.to_l})"

    # Doors
    door_ht = height - plinth
    # Use 10mm gap for handled system, 30mm for gola system
    top_gap = door_system == 'gola' ? 30.mm : 10.mm
    adjusted_door_ht = door_ht - top_gap
    avail_door = cab_w - 2 * door_side_clearance
    if cab_w < 599.5.mm
      door_grp = c_grp.entities.add_group
      fd = door_grp.entities.add_face([door_side_clearance, 0, edge_band_thk],
                                      [door_side_clearance + avail_door, 0, edge_band_thk],
                                      [door_side_clearance + avail_door, 0, adjusted_door_ht - edge_band_thk],
                                      [door_side_clearance, 0, adjusted_door_ht - edge_band_thk])
      fd.pushpull(face_mat_thk)
      door_grp.name = "#{prefix}Sink Cabinet - Single Door"
    else
      total_door = avail_door - door_gap
      half_door  = total_door / 2.0
      [[0, 'Left Door'], [half_door + door_gap, 'Right Door']].each do |(dx, name)|
        door_grp = c_grp.entities.add_group
        fd = door_grp.entities.add_face([door_side_clearance + dx, 0, edge_band_thk],
                                        [door_side_clearance + dx + half_door, 0, edge_band_thk],
                                        [door_side_clearance + dx + half_door, 0, adjusted_door_ht - edge_band_thk],
                                        [door_side_clearance + dx, 0, adjusted_door_ht - edge_band_thk])
        fd.pushpull(face_mat_thk)
        door_grp.name = "#{prefix}Sink Cabinet - #{name}"
      end
    end
  end

  # ----------------------------------------------------------------------
  #                   NEW: CUSTOM COCKER CABINET FOR BOTTOM UNITS
  # ----------------------------------------------------------------------
  def self.create_bottom_cocker_unit(x_offset, cab_w, params)
    model = Sketchup.active_model
    ents  = model.active_entities
    bottom_z_offset = params[:bottom_z_offset] || 100.mm
    project_name    = params[:project_name] || ''
    prefix          = project_name.empty? ? '' : "#{project_name} - "
    door_system     = params[:door_system] || 'handled'

    depth           = params[:depth]
    height          = params[:height]
    panel_thk       = params[:panel_thk]
    plinth          = params[:plinth]
    door_gap        = params[:door_gap]
    door_side_clearance = params[:door_side_clearance]
    edge_band_thk   = params[:edge_band_thk] || params[:edge_band_thickness] || 0.mm
    face_mat_thk    = params[:face_mat_thk] || 3.mm

    top_rail_height         = 50.mm
    cocker_stretcher_height = 100.mm

    c_grp = ents.add_group
    c_grp.transformation = Geom::Transformation.new([x_offset, -depth, bottom_z_offset])
    c_grp.name = "#{prefix}Bottom Box (Cocker) - W=#{cab_w.to_l}"

    # Bottom Panel
    bot_grp = c_grp.entities.add_group
    f_bot = bot_grp.entities.add_face([0, 0, 0],
                                      [cab_w, 0, 0],
                                      [cab_w, depth, 0],
                                      [0, depth, 0])
    f_bot.pushpull(-panel_thk)
    bot_grp.name = "#{prefix}Cocker Bottom Panel"

    # Left & Right Panels
    left_grp = c_grp.entities.add_group
    f_left = left_grp.entities.add_face([0, 0, panel_thk],
                                        [panel_thk, 0, panel_thk],
                                        [panel_thk, depth, panel_thk],
                                        [0, depth, panel_thk])
    f_left.pushpull(height - plinth - panel_thk)
    left_grp.name = "#{prefix}Cocker Left Panel"

    right_grp = c_grp.entities.add_group
    f_right = right_grp.entities.add_face([cab_w - panel_thk, 0, panel_thk],
                                          [cab_w, 0, panel_thk],
                                          [cab_w, depth, panel_thk],
                                          [cab_w - panel_thk, depth, panel_thk])
    f_right.pushpull(height - plinth - panel_thk)
    right_grp.name = "#{prefix}Cocker Right Panel"

    # Only add Gola cuts if door system is "gola"
    if door_system == 'gola'
      # Cocker L Gola
      l_bottom = height - plinth - 59.mm
      l_top    = height - plinth
      f_lg = left_grp.entities.add_face([0, 0, l_bottom],
                                        [panel_thk, 0, l_bottom],
                                        [panel_thk, 0, l_top],
                                        [0, 0, l_top])
      f_lg.pushpull(-26.mm)
      left_grp.name += ' + L Gola'
      f_rg = right_grp.entities.add_face([cab_w - panel_thk, 0, l_bottom],
                                         [cab_w, 0, l_bottom],
                                         [cab_w, 0, l_top],
                                         [cab_w - panel_thk, 0, l_top])
      f_rg.pushpull(-26.mm)
      right_grp.name += ' + L Gola'
    end

    # Top Rails
    top_z = height - plinth
    rail_depth = panel_thk
    front_rail_grp = c_grp.entities.add_group
    rail_y = 26.mm
    f_fr = front_rail_grp.entities.add_face(
      [panel_thk, rail_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_y, top_z],
      [panel_thk, rail_y, top_z]
    )
    f_fr.pushpull(-rail_depth)
    front_rail_grp.name = "#{prefix}Cocker Front Rail"

    rear_rail_grp = c_grp.entities.add_group
    rail_back_y = depth - 26.mm
    f_rr = rear_rail_grp.entities.add_face(
      [panel_thk, rail_back_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_back_y, top_z - top_rail_height],
      [cab_w - panel_thk, rail_back_y, top_z],
      [panel_thk, rail_back_y, top_z]
    )
    f_rr.pushpull(-rail_depth)
    rear_rail_grp.name = "#{prefix}Cocker Rear Top Rail"

    # Back Stretcher
    s_depth = panel_thk
    bottom_stretcher_grp = c_grp.entities.add_group
    bs_z_bottom = panel_thk
    bs_z_top    = bs_z_bottom + cocker_stretcher_height
    bs_x1 = panel_thk
    bs_x2 = cab_w - panel_thk
    f_bs = bottom_stretcher_grp.entities.add_face(
      [bs_x1, depth - s_depth, bs_z_bottom],
      [bs_x2, depth - s_depth, bs_z_bottom],
      [bs_x2, depth - s_depth, bs_z_top],
      [bs_x1, depth - s_depth, bs_z_top]
    )
    f_bs.pushpull(-panel_thk)
    bottom_stretcher_grp.name = "#{prefix}Cocker Bottom Rear Stretcher (#{cocker_stretcher_height.to_l})"

    # Doors
    door_ht = height - plinth
    # Use 10mm gap for handled system, 30mm for gola system
    top_gap = door_system == 'gola' ? 30.mm : 10.mm
    adjusted_door_ht = door_ht - top_gap
    avail_door = cab_w - 2 * door_side_clearance
    if cab_w < 599.5.mm
      door_grp = c_grp.entities.add_group
      fd = door_grp.entities.add_face([door_side_clearance, 0, edge_band_thk],
                                      [door_side_clearance + avail_door, 0, edge_band_thk],
                                      [door_side_clearance + avail_door, 0, adjusted_door_ht - edge_band_thk],
                                      [door_side_clearance, 0, adjusted_door_ht - edge_band_thk])
      fd.pushpull(face_mat_thk)
      door_grp.name = "#{prefix}Cocker Cabinet - Single Door"
    else
      total_door = avail_door - door_gap
      half_door  = total_door / 2.0
      [[0, 'Left Door'], [half_door + door_gap, 'Right Door']].each do |(dx, name)|
        door_grp = c_grp.entities.add_group
        fd = door_grp.entities.add_face([door_side_clearance + dx, 0, edge_band_thk],
                                        [door_side_clearance + dx + half_door, 0, edge_band_thk],
                                        [door_side_clearance + dx + half_door, 0, adjusted_door_ht - edge_band_thk],
                                        [door_side_clearance + dx, 0, adjusted_door_ht - edge_band_thk])
        fd.pushpull(face_mat_thk)
        door_grp.name = "#{prefix}Cocker Cabinet - #{name}"
      end
    end
  end

  def self.create_panel(entities, plane, origin, width, height, thickness)
    group = entities.add_group
    faces = group.entities
    ox, oy, oz = origin

    case plane
    when :xy
      pts = [[ox, oy, oz], [ox + width, oy, oz], [ox + width, oy + height, oz], [ox, oy + height, oz]]
      face = faces.add_face(pts)
      face.reverse! if face.normal.z < 0
      face.pushpull(thickness)
    when :xz
      pts = [[ox, oy, oz], [ox + width, oy, oz], [ox + width, oy, oz + height], [ox, oy, oz + height]]
      face = faces.add_face(pts)
      face.reverse! if face.normal.y < 0
      face.pushpull(thickness)
    when :yz
      pts = [[ox, oy, oz], [ox, oy + width, oz], [ox, oy + width, oz + height], [ox, oy, oz + height]]
      face = faces.add_face(pts)
      face.reverse! if face.normal.x < 0
      face.pushpull(thickness)
    end
    group
  end

  def self.create_tall_cabinet(params)
    # Tall unit remains unchanged except for a 10.mm reduction in back panel height.
    model = Sketchup.active_model
    entities = model.active_entities

    project_name  = params[:project_name] || ''
    prefix        = project_name.empty? ? '' : "#{project_name} - "
    total_height  = params[:total_height]
    plinth_height = params[:plinth_height]
    cabinet_width = params[:cabinet_width]
    cabinet_depth = params[:cabinet_depth]
    door_thickness = params[:door_thickness]
    carcase_thk   = params[:carcase_thk]
    back_thk      = params[:back_thk]
    groove_depth  = params[:groove_depth]
    num_shelves   = params[:tall_shelf_count]
    door_gap      = params[:door_gap]

    tall_unit = entities.add_group
    tall_unit.name = "#{prefix}Tall Unit #{cabinet_width.to_l}"
    unit_name_prefix = tall_unit.name + ' - '
    sub_ents = tall_unit.entities

    # Plinth height is ONLY for calculations (not a physical part)
    # Used for: cabinet body height calculation, panel positioning

    cabinet_body_hgt = total_height - plinth_height # Always subtract full plinth from total
    interior_depth   = cabinet_depth - door_thickness
    shelf_depth      = interior_depth - carcase_thk - back_thk
    door_clearance   = 3.mm
    door_width       = cabinet_width - 2 * door_clearance
    # Door height should cover full cabinet body height
    door_height      = cabinet_body_hgt

    # NO physical plinth created - plinth_height is only for calculations

    # All panels start at plinth_height in local coords (bottom panel sits at Z=plinth_height)
    bottom_origin = [0, 0, plinth_height]
    bottom_panel = create_panel(sub_ents, :xy, bottom_origin, cabinet_width, interior_depth, carcase_thk)
    bottom_panel.name = unit_name_prefix + 'Bottom Panel'

    side_start_z = plinth_height + carcase_thk
    side_height  = cabinet_body_hgt - carcase_thk
    left_side_panel = create_panel(sub_ents, :yz, [0, 0, side_start_z], interior_depth, side_height, carcase_thk)
    left_side_panel.name = unit_name_prefix + 'Left Side Panel'

    right_side_panel = create_panel(sub_ents, :yz, [cabinet_width, 0, side_start_z], interior_depth, side_height,
                                    -carcase_thk)
    right_side_panel.name = unit_name_prefix + 'Right Side Panel'

    top_origin = [carcase_thk, 0, plinth_height + cabinet_body_hgt - carcase_thk]
    top_panel = create_panel(sub_ents, :xy, top_origin, cabinet_width - 2 * carcase_thk, interior_depth, carcase_thk)
    top_panel.name = unit_name_prefix + 'Top Panel'

    back_x_origin = carcase_thk - groove_depth
    back_width    = (cabinet_width - 2 * carcase_thk) + 2 * groove_depth
    back_z_origin = (plinth_height + carcase_thk) - groove_depth
    # reduce back panel height by 10 mm
    back_height   = ((cabinet_body_hgt - carcase_thk)) + 2 * groove_depth - 10.mm
    back_y_origin = interior_depth - carcase_thk - back_thk
    back_panel = create_panel(sub_ents, :xz, [back_x_origin, back_y_origin, back_z_origin], back_width, back_height,
                              back_thk)
    back_panel.name = unit_name_prefix + 'Back Panel'

    # Back Stretchers for tall cabinet - positioned identically to bottom boxes
    # Position at wall (Y = interior_depth) using face creation then pushpull
    stretcher_height = 100.mm
    stretcher_width = cabinet_width - 2 * carcase_thk # Between side panels
    stretcher_depth = carcase_thk # Carcase thickness depth
    stretcher_y = interior_depth # At wall position

    # Bottom back stretcher (sits flush on bottom panel at Z = side_start_z)
    bottom_stretcher_grp = sub_ents.add_group
    f_bs_bot = bottom_stretcher_grp.entities.add_face([carcase_thk, stretcher_y, side_start_z],
                                                      [carcase_thk + stretcher_width, stretcher_y, side_start_z],
                                                      [carcase_thk + stretcher_width, stretcher_y,
                                                       side_start_z + stretcher_height],
                                                      [carcase_thk, stretcher_y, side_start_z + stretcher_height])
    f_bs_bot.pushpull(stretcher_depth) # Positive = push forward toward front
    bottom_stretcher_grp.name = unit_name_prefix + "Bottom Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    # Top back stretcher (positioned UNDER the top panel)
    top_stretcher_z = plinth_height + cabinet_body_hgt - carcase_thk - stretcher_height
    top_stretcher_grp = sub_ents.add_group
    f_bs_top = top_stretcher_grp.entities.add_face([carcase_thk, stretcher_y, top_stretcher_z],
                                                   [carcase_thk + stretcher_width, stretcher_y, top_stretcher_z],
                                                   [carcase_thk + stretcher_width, stretcher_y,
                                                    top_stretcher_z + stretcher_height],
                                                   [carcase_thk, stretcher_y, top_stretcher_z + stretcher_height])
    f_bs_top.pushpull(stretcher_depth) # Positive = push forward toward front
    top_stretcher_grp.name = unit_name_prefix + "Top Back Stretcher (100mm tall x #{stretcher_depth.to_l} deep)"

    if num_shelves > 0
      vertical_space = cabinet_body_hgt - 2 * carcase_thk
      compartment = vertical_space / (num_shelves + 1).to_f
      (1..num_shelves).each do |i|
        shelf_z = side_start_z + (compartment * i)
        shelf_panel = create_panel(sub_ents, :xy, [carcase_thk, 0, shelf_z],
                                   cabinet_width - 2 * carcase_thk, shelf_depth, carcase_thk)
        shelf_panel.name = unit_name_prefix + "Shelf #{i}"
      end
    end

    if door_width > 599.mm
      left_door_width  = (door_width - door_gap) / 2.0
      right_door_width = left_door_width
      left_door_panel = create_panel(sub_ents, :xz, [door_clearance, 0, plinth_height],
                                     left_door_width, door_height, -door_thickness)
      left_door_panel.name = unit_name_prefix + 'Left Door Panel'

      right_door_panel = create_panel(sub_ents, :xz, [door_clearance + left_door_width + door_gap, 0, plinth_height],
                                      right_door_width, door_height, -door_thickness)
      right_door_panel.name = unit_name_prefix + 'Right Door Panel'
    else
      door_panel = create_panel(sub_ents, :xz, [door_clearance, 0, plinth_height],
                                door_width, door_height, -door_thickness)
      door_panel.name = unit_name_prefix + 'Door'
    end

    # ==================================================================
    # SIDE PANELS for Tall Unit
    # ==================================================================
    side_panel_config = params[:side_panels] || 'none'
    panel_thickness = carcase_thk # Use same thickness as carcase
    panel_height = total_height # Full height from floor to top

    # Side panels positioned further forward by door_thickness + 3mm (in Y direction - depth)
    panel_forward_offset = door_thickness + 3.mm # Positive Y to move forward (away from wall)

    case side_panel_config
    when 'both'
      # Both sides covered - START at door_thickness+3mm forward, extend back to wall
      # Panels positioned forward by door_thickness + 3mm

      # Left side panel
      left_side_panel_ext = create_panel(sub_ents, :yz, [-panel_thickness, -panel_forward_offset, 0],
                                         interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      left_side_panel_ext.name = unit_name_prefix + 'Left Side Panel (Full)'

      # Right side panel
      right_side_panel_ext = create_panel(sub_ents, :yz, [cabinet_width, -panel_forward_offset, 0],
                                          interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      right_side_panel_ext.name = unit_name_prefix + 'Right Side Panel (Full)'

    when 'left_100mm'
      # Left side: THIN 100mm panel (space saver, against wall, not visible)
      # Right side: FULL panel (visible side)
      # Both panels: START forward by door_thickness + 3mm

      # Left panel - THIN 100mm depth (space saver)
      left_side_panel_ext = create_panel(sub_ents, :yz, [-panel_thickness, -panel_forward_offset, 0],
                                         100.mm, panel_height, panel_thickness)
      left_side_panel_ext.name = unit_name_prefix + 'Left Side Panel (100mm Thin - Space Saver)'

      # Right panel - FULL depth (visible side)
      right_side_panel_ext = create_panel(sub_ents, :yz, [cabinet_width, -panel_forward_offset, 0],
                                          interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      right_side_panel_ext.name = unit_name_prefix + 'Right Side Panel (Full - Visible)'

    when 'right_100mm'
      # Right side: THIN 100mm panel (space saver, against wall, not visible)
      # Left side: FULL panel (visible side)
      # Both panels: START forward by door_thickness + 3mm

      # Left panel - FULL depth (visible side)
      left_side_panel_ext = create_panel(sub_ents, :yz, [-panel_thickness, -panel_forward_offset, 0],
                                         interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      left_side_panel_ext.name = unit_name_prefix + 'Left Side Panel (Full - Visible)'

      # Right panel - THIN 100mm depth (space saver)
      right_side_panel_ext = create_panel(sub_ents, :yz, [cabinet_width, -panel_forward_offset, 0],
                                          100.mm, panel_height, panel_thickness)
      right_side_panel_ext.name = unit_name_prefix + 'Right Side Panel (100mm Thin - Space Saver)'

    when 'left_only'
      # Left side only - START forward by door_thickness + 3mm
      left_side_panel_ext = create_panel(sub_ents, :yz, [-panel_thickness, -panel_forward_offset, 0],
                                         interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      left_side_panel_ext.name = unit_name_prefix + 'Left Side Panel (Full)'

    when 'right_only'
      # Right side only - START forward by door_thickness + 3mm
      right_side_panel_ext = create_panel(sub_ents, :yz, [cabinet_width, -panel_forward_offset, 0],
                                          interior_depth + door_thickness + 3.mm, panel_height, panel_thickness)
      right_side_panel_ext.name = unit_name_prefix + 'Right Side Panel (Full)'
    end

    # Tall cabinet positioned with back at Y=0, at Z=0 (no lift in transformation)
    # Height calculation: plinth (local Z=0 to plinth_height) + cabinet body (plinth_height to total_height)
    # World MAX Z = 0 (transformation) + plinth_height (local bottom) + cabinet_body_hgt = total_height
    x_pos = params[:x_position] || 0.mm # Use provided X position or default to 0
    tall_unit.transformation = Geom::Transformation.new([x_pos, -interior_depth, 0])
  end

  # ----------------------------------------------------------------------
  #              GENERATE PLINTH COVERS
  # ----------------------------------------------------------------------
  def self.generate_plinth_covers
    model = Sketchup.active_model
    plinth_covers = []
    plinth_height = 98.mm # Standard plinth cover height
    board_length = 2438.mm # 8 feet
    1220.mm # 4 feet
    panel_thickness = 18.mm # Carcase material thickness

    # Calculate total width needed from all bottom cabinets
    total_width_needed = 0.mm
    model.active_entities.grep(Sketchup::Group).each do |grp|
      if grp.name =~ /Bottom Box|Corner Cabinet|Sink|Cocker/i
        bbox = grp.bounds
        total_width_needed += bbox.width
      end
    end

    return plinth_covers if total_width_needed <= 0

    # Cut plinth covers as long as possible from 8ft boards
    remaining_width = total_width_needed
    piece_num = 1
    board_num = 1

    while remaining_width > 0.mm
      if remaining_width >= board_length
        # Cut full 8ft piece
        plinth_covers << {
          name: "Plinth Cover #{piece_num} (8ft from Board #{board_num})",
          width: board_length,
          height: plinth_height,
          thickness: panel_thickness
        }
        remaining_width -= board_length
        piece_num += 1
        board_num += 1
      else
        # Cut remaining piece (less than 8ft)
        plinth_covers << {
          name: "Plinth Cover #{piece_num} (#{remaining_width.to_l} from Board #{board_num})",
          width: remaining_width,
          height: plinth_height,
          thickness: panel_thickness
        }
        remaining_width = 0.mm
        board_num += 1
      end
    end

    plinth_covers
  end

  # ----------------------------------------------------------------------
  #              CREATE PLINTH COVER GEOMETRY
  # ----------------------------------------------------------------------
  def self.create_plinth_covers_geometry
    model = Sketchup.active_model
    plinth_height = 98.mm
    board_length = 2438.mm
    carcase_thk = 18.mm # Plinth thickness (carcase thickness, not 100mm)
    plinth_z_position = 0.mm # At floor level

    # Default bottom cabinet depth (should match UI default)
    box_total_depth = 560.mm
    plinth_y_position = -box_total_depth + 50.mm # 50mm from back of box (Y = -560 + 50 = -510mm)

    # Calculate total width and starting X position
    start_x = nil
    end_x = nil

    model.active_entities.grep(Sketchup::Group).each do |grp|
      next unless grp.name =~ /Bottom Box|Corner Cabinet|Sink|Cocker/i

      bbox = grp.bounds

      # Get the leftmost and rightmost positions
      start_x = bbox.min.x if start_x.nil? || bbox.min.x < start_x
      end_x = bbox.max.x if end_x.nil? || bbox.max.x > end_x
    end

    return if start_x.nil? || end_x.nil?

    # Calculate total width as span from leftmost to rightmost
    total_width_needed = end_x - start_x

    # Create plinth covers as long pieces
    remaining_width = total_width_needed
    piece_num = 1
    current_x = start_x

    while remaining_width > 0.mm
      if remaining_width >= board_length
        # Create full 8ft piece
        piece_width = board_length
        plinth_grp = model.active_entities.add_group
        plinth_grp.transformation = Geom::Transformation.new([current_x, plinth_y_position, plinth_z_position])

        face = plinth_grp.entities.add_face([0, 0, 0],
                                            [piece_width, 0, 0],
                                            [piece_width, 0, plinth_height],
                                            [0, 0, plinth_height])
        face.pushpull(-carcase_thk) # Negative = push backward toward wall (18mm)
        plinth_grp.name = "Plinth Cover #{piece_num} (8ft - #{piece_width.to_l})"

        remaining_width -= board_length
        current_x += board_length
        piece_num += 1
      else
        # Create remaining piece
        piece_width = remaining_width
        plinth_grp = model.active_entities.add_group
        plinth_grp.transformation = Geom::Transformation.new([current_x, plinth_y_position, plinth_z_position])

        face = plinth_grp.entities.add_face([0, 0, 0],
                                            [piece_width, 0, 0],
                                            [piece_width, 0, plinth_height],
                                            [0, 0, plinth_height])
        face.pushpull(-carcase_thk) # Negative = push backward toward wall (18mm)
        plinth_grp.name = "Plinth Cover #{piece_num} (#{piece_width.to_l})"

        remaining_width = 0.mm
      end
    end
  end

  # ----------------------------------------------------------------------
  #              HELPER: RECURSIVE GROUP COLLECTION
  # ----------------------------------------------------------------------
  def self.recursive_collect_groups(entity, parts)
    if entity.is_a?(Sketchup::Group) && entity.name && !entity.name.empty?
      bbox = entity.bounds
      w = bbox.width.to_f
      d = bbox.depth.to_f
      h = bbox.height.to_f
      parts << [entity.name, w, d, h]
    end

    return unless entity.respond_to?(:entities)

    entity.entities.each do |sub_ent|
      recursive_collect_groups(sub_ent, parts) if sub_ent.is_a?(Sketchup::Group)
    end
  end

  # ----------------------------------------------------------------------
  #                EXPORT PART LIST TO CSV
  # ----------------------------------------------------------------------
  def self.export_part_list_to_csv
    model = Sketchup.active_model
    parts = []
    model.active_entities.each { |ent| recursive_collect_groups(ent, parts) if ent.is_a?(Sketchup::Group) }

    # Generate plinth covers
    plinth_covers = generate_plinth_covers

    # Add plinth covers to parts list
    plinth_covers.each do |pc|
      parts << [pc[:name], pc[:width], pc[:height], pc[:thickness]]
    end

    parts_with_thickness = parts.map do |p|
      name, w, d, h = p
      material_thickness = [w, d, h].min
      box_num = name =~ /(?:Top Cabinet|Bottom Box|Tall Unit)\s*(\d+)/i ? ::Regexp.last_match(1).to_i : 0
      [name, material_thickness, w, d, h, box_num]
    end
    sorted_parts = parts_with_thickness.sort_by { |name, thick, _w, _d, _h, box_num| [thick, box_num, name] }
    csv_data = "Part Name,Material Thickness,Width,Depth,Height\n"
    sorted_parts.each { |p| csv_data << "#{p[0]},#{p[1]},#{p[2]},#{p[3]},#{p[4]}\n" }

    # Add summary of plinth boards needed
    csv_data << "\n\nPLINTH COVER SUMMARY:\n"
    csv_data << "#{plinth_covers.length} pieces required\n"
    board_count = plinth_covers.map { |pc| pc[:name][/Board (\d+)/, 1].to_i }.max || 0
    csv_data << "#{board_count} board(s) needed (2438mm x 1220mm x 18mm)\n"

    filename = UI.savepanel('Export Part List CSV', '', 'part_list.csv')
    File.write(filename, csv_data) if filename
    return unless filename

    UI.messagebox("Part list exported to CSV:\n#{filename}\n\nIncludes #{plinth_covers.length} plinth covers from #{board_count} board(s)")
  end

  unless file_loaded?(__FILE__)
    # ═══════════════════════════════════════════════════════════════════
    # ENHANCED TOOLBAR WITH ALL UNIT TYPES
    # ═══════════════════════════════════════════════════════════════════

    # Get icons directory
    script_dir = File.dirname(__FILE__)
    icons_dir = File.join(script_dir, 'icon')

    # Helper to get icon path with fallback to empty string
    def self.get_icon(icons_dir, filename)
      path = File.join(icons_dir, filename)
      File.exist?(path) ? path : ''
    end

    # Create main toolbar
    toolbar = UI::Toolbar.new('CBX Cabinet System')

    # ═══════════════════════════════════════════════════════════════════
    # 🎯 BUTTON 1: MAIN CREATE/EDIT DIALOG (SHOTGUN)
    # ═══════════════════════════════════════════════════════════════════
    cmd_main = UI::Command.new('Create/Edit Cabinets') do
      show_html_dialog
    end
    cmd_main.small_icon = get_icon(icons_dir, 'cbx_shotgun.png')
    cmd_main.large_icon = get_icon(icons_dir, 'cbx_shotgun.png')
    cmd_main.tooltip = "CBX Shotgun: Full Cabinet Creation\n(Main Interface with all options)"
    cmd_main.status_bar_text = 'Open CBX Shotgun - Full Creation Dialog with all settings'
    toolbar.add_item(cmd_main)

    toolbar.add_separator

    # ═══════════════════════════════════════════════════════════════════
    # 🎨 PLACEHOLDER CREATION BUTTONS (Auto-spawn at origin)
    # ═══════════════════════════════════════════════════════════════════

    # Button: Bottom Cabinet Placeholder (RED)
    cmd_placeholder_bottom = UI::Command.new('Bottom Placeholder') do
      create_placeholder('bottom', true)
    end
    cmd_placeholder_bottom.small_icon = get_icon(icons_dir, 'cbx_bottom.png')
    cmd_placeholder_bottom.large_icon = get_icon(icons_dir, 'cbx_bottom.png')
    cmd_placeholder_bottom.tooltip = "Create Bottom Cabinet Placeholder (RED)\nThin face marker at Z=0 (ground level)\nAuto-spawns with 100mm X-spacing"
    cmd_placeholder_bottom.status_bar_text = 'Create RED thin face marker for bottom cabinets - spawns at ground level'
    toolbar.add_item(cmd_placeholder_bottom)

    # Button: Top Cabinet Placeholder (GREEN)
    cmd_placeholder_top = UI::Command.new('Top Placeholder') do
      create_placeholder('top', true)
    end
    cmd_placeholder_top.small_icon = get_icon(icons_dir, 'cbx_top.png')
    cmd_placeholder_top.large_icon = get_icon(icons_dir, 'cbx_top.png')
    cmd_placeholder_top.tooltip = "Create Top Cabinet Placeholder (GREEN)\nThin face marker Z=1500-2100mm (matches Tall)\nAuto-spawns with 100mm X-spacing"
    cmd_placeholder_top.status_bar_text = 'Create GREEN thin face marker for top cabinets - Z=1500-2100mm (same as Tall top)'
    toolbar.add_item(cmd_placeholder_top)

    # Button: Tall Cabinet Placeholder (BLUE)
    cmd_placeholder_tall = UI::Command.new('Tall Placeholder') do
      create_placeholder('tall', true)
    end
    cmd_placeholder_tall.small_icon = get_icon(icons_dir, 'cbx_tall.png')
    cmd_placeholder_tall.large_icon = get_icon(icons_dir, 'cbx_tall.png')
    cmd_placeholder_tall.tooltip = "Create Tall Cabinet Placeholder (BLUE)\nThin face marker at Z=0, Height=2100mm\nAuto-spawns with 100mm X-spacing"
    cmd_placeholder_tall.status_bar_text = 'Create BLUE thin face marker for tall cabinets (2100mm) - spawns at ground'
    toolbar.add_item(cmd_placeholder_tall)

    toolbar.add_separator

    # ═══════════════════════════════════════════════════════════════════
    # 🏗️ WALL & CUTOUT SYSTEM
    # ═══════════════════════════════════════════════════════════════════

    # Button: Create Wall Room
    cmd_wall_room = UI::Command.new('Create Wall Room') do
      create_wall_room
    end
    cmd_wall_room.small_icon = get_icon(icons_dir, 'cbx_wall.png')
    cmd_wall_room.large_icon = get_icon(icons_dir, 'cbx_wall.png')
    cmd_wall_room.tooltip = "Create Wall Room\nEnter Wall A/B/C/D lengths\nCreates perpendicular 90° walls"
    cmd_wall_room.status_bar_text = 'Create room with 4 perpendicular walls from dimensions'
    toolbar.add_item(cmd_wall_room)

    # Button: Door Cutout Placeholder
    cmd_door_cutout = UI::Command.new('Door Cutout') do
      create_placeholder('door_cutout', false)
    end
    cmd_door_cutout.small_icon = get_icon(icons_dir, 'cbx_create.PNG')
    cmd_door_cutout.large_icon = get_icon(icons_dir, 'cbx_create.PNG')
    cmd_door_cutout.tooltip = "Create Door Cutout Placeholder (ORANGE)\nFor marking door openings in walls"
    cmd_door_cutout.status_bar_text = 'Create ORANGE door cutout marker'
    toolbar.add_item(cmd_door_cutout)

    # Button: Window Cutout Placeholder
    cmd_window_cutout = UI::Command.new('Window Cutout') do
      create_placeholder('window_cutout', false)
    end
    cmd_window_cutout.small_icon = get_icon(icons_dir, 'cbx_open.png')
    cmd_window_cutout.large_icon = get_icon(icons_dir, 'cbx_open.png')
    cmd_window_cutout.tooltip = "Create Window Cutout Placeholder (CYAN)\nFor marking window openings in walls"
    cmd_window_cutout.status_bar_text = 'Create CYAN window cutout marker'
    toolbar.add_item(cmd_window_cutout)

    toolbar.add_separator

    # ═══════════════════════════════════════════════════════════════════
    # 🔫 SHOTGUN MENU TRIGGER (Select placeholder first)
    # ═══════════════════════════════════════════════════════════════════

    # Button: Open Shotgun Menu for Selected Box
    cmd_shotgun_selected = UI::Command.new('Shotgun Menu') do
      show_shotgun_menu_for_selection
    end
    cmd_shotgun_selected.small_icon = get_icon(icons_dir, 'cbx_drawer.png')
    cmd_shotgun_selected.large_icon = get_icon(icons_dir, 'cbx_drawer.png')
    cmd_shotgun_selected.tooltip = "Shotgun Menu for Selected Placeholder\n1. Select a colored box\n2. Click this button\n3. Choose cabinet type"
    cmd_shotgun_selected.status_bar_text = 'Open Shotgun options menu for selected placeholder box'
    toolbar.add_item(cmd_shotgun_selected)

    toolbar.add_separator

    # ═══════════════════════════════════════════════════════════════════
    #  ️ UTILITY BUTTONS
    # ═══════════════════════════════════════════════════════════════════

    # Button: Reset Spawn Position
    cmd_reset_spawn = UI::Command.new('Reset Spawn') do
      reset_spawn_position
      UI.messagebox("✓ Spawn position reset!\n\nNext placeholder will spawn at origin (0,0,0)")
    end
    cmd_reset_spawn.small_icon = get_icon(icons_dir, 'cbx_autofill.png')
    cmd_reset_spawn.large_icon = get_icon(icons_dir, 'cbx_autofill.png')
    cmd_reset_spawn.tooltip = "Reset Spawn Position\nNext placeholder will spawn at origin"
    cmd_reset_spawn.status_bar_text = 'Reset auto-spawn position to origin (0,0,0)'
    toolbar.add_item(cmd_reset_spawn)

    # Button: Export to CSV
    cmd_export_csv = UI::Command.new('Export CSV') do
      export_part_list_to_csv
    end
    cmd_export_csv.small_icon = get_icon(icons_dir, 'cbx_cnc_export.PNG')
    cmd_export_csv.large_icon = get_icon(icons_dir, 'cbx_cnc_export.PNG')
    cmd_export_csv.tooltip = "Export Part List to CSV\nFor CNC manufacturing"
    cmd_export_csv.status_bar_text = 'Export all cabinet parts to CSV file'
    toolbar.add_item(cmd_export_csv)

    # Button: Auto-Label (if CBX_Labels_2D module exists)
    if defined?(CBXLabels2D)
      cmd_labels = UI::Command.new('Auto-Label All') do
        CBXLabels2D.label_all_cabinets_in_model
      end
      cmd_labels.small_icon = get_icon(icons_dir, 'label_16.png')
      cmd_labels.large_icon = get_icon(icons_dir, 'label_24.png')
      cmd_labels.tooltip = "Auto-Label All Parts\n(Add part names + dimensions)"
      cmd_labels.status_bar_text = 'Add 2D text labels to all cabinet parts'
      toolbar.add_item(cmd_labels)
    end

    # Button: CNC Export Prep (if CBX_Labels_2D module exists)
    if defined?(CBXLabels2D)
      cmd_cnc = UI::Command.new('Prepare CNC Export') do
        CBXLabels2D.prepare_for_cnc_export
      end
      cmd_cnc.small_icon = get_icon(icons_dir, 'cnc_16.png')
      cmd_cnc.large_icon = get_icon(icons_dir, 'cnc_24.png')
      cmd_cnc.tooltip = "Prepare for CNC Export\n(DXF with labels)"
      cmd_cnc.status_bar_text = 'Prepare model for DXF export to CNC'
      toolbar.add_item(cmd_cnc)
    end

    # Show toolbar
    toolbar.show
    
    puts "✓ CBX Cabinet System Loaded!"
    puts "  - Toolbar: 10 buttons (Shotgun + Placeholders + Wall + Utilities)"
    puts "  - Placeholders spawn at origin with 100mm gaps"
    puts "  - SELECT placeholder → Click Shotgun → Dimensions auto-fill!"
    puts "  - Wall room creator with perpendicular walls"
    puts ""
    puts "Quick Start:"
    puts "  1. Click placeholder buttons (RED/GREEN/BLUE)"
    puts "  2. Colored volumes spawn automatically with 100mm spacing"
    puts "  3. SELECT placeholder → Click Shotgun button"
    puts "  4. Dimensions auto-fill → Configure → Create cabinet!"
    puts "  5. Placeholder remains as reference marker"

    # ═══════════════════════════════════════════════════════════════════
    # 📋 MENU ITEMS (Extensions → CBX Cabinet System)
    # ═══════════════════════════════════════════════════════════════════

    menu = UI.menu('Extensions').add_submenu('CBX Cabinet System')

    # Main dialog
    menu.add_item('🎯 Shotgun: Create / Edit Cabinets') { show_html_dialog }
    menu.add_separator
    
    # Placeholders
    placeholder_menu = menu.add_submenu('🎨 Create Placeholders')
    placeholder_menu.add_item('Bottom Cabinet (RED)') { create_placeholder('bottom', true) }
    placeholder_menu.add_item('Top Cabinet (GREEN)') { create_placeholder('top', true) }
    placeholder_menu.add_item('Tall Cabinet (BLUE)') { create_placeholder('tall', true) }
    placeholder_menu.add_separator
    placeholder_menu.add_item('Door Cutout (ORANGE)') { create_placeholder('door_cutout', false) }
    placeholder_menu.add_item('Window Cutout (CYAN)') { create_placeholder('window_cutout', false) }
    
    menu.add_separator
    
    # Wall room
    menu.add_item('🏗️ Create Wall Room (A/B/C/D)') { create_wall_room }
    menu.add_separator
    
    # Shotgun for selection
    menu.add_item('🔫 Shotgun Menu (for selected box)') { show_shotgun_menu_for_selection }
    menu.add_separator
    
    # Reset
    menu.add_item('🔄 Reset Spawn Position') { reset_spawn_position; UI.messagebox("Spawn reset to origin") }
    menu.add_separator

    # Utilities
    menu.add_item('📊 Export Part List CSV') { export_part_list_to_csv }
    if defined?(CBXLabels2D)
      menu.add_item('🏷️ Auto-Label All Parts') { CBXLabels2D.label_all_cabinets_in_model }
      menu.add_item('🔧 Prepare CNC Export') { CBXLabels2D.prepare_for_cnc_export }
    end
    menu.add_separator
    menu.add_item('ℹ️ About CBX') do
      UI.messagebox(
        "CBX CABINET SYSTEM v2.0 + PLACEHOLDER WORKFLOW\n" +
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
        "WORKFLOW:\n" +
        "1. Create wall room (Wall A/B/C/D)\n" +
        "2. Add door/window cutouts\n" +
        "3. Create placeholders (RED/GREEN/BLUE)\n" +
        "4. Select placeholder → Click Shotgun Menu\n" +
        "5. Choose cabinet type → Opens Shotgun dialog\n\n" +
        "FEATURES:\n" +
        "✓ Auto-spawning placeholders (100mm gap)\n" +
        "✓ Perpendicular wall room creation\n" +
        "✓ Door/window cutout markers\n" +
        "✓ Shotgun integration for all cabinet types\n" +
        "✓ CSV export & CNC labeling\n" +
        "✓ Professional 2.0mm gap standards\n\n" +
        "COLOR SYSTEM:\n" +
        "  RED = Bottom cabinets\n" +
        "  GREEN = Top cabinets\n" +
        "🔵 BLUE = Tall cabinets\n" +
        "🟡 YELLOW = Walls\n" +
        "🟠 ORANGE = Doors\n" +
        "🔵 CYAN = Windows\n\n" +
        'Created by CBX Team',
        MB_OK,
        'About CBX Cabinet System'
      )
    end

    file_loaded(__FILE__)
  end
end
