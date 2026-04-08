# Ruby CBX Design Rules: Comprehensive Layout Logic

This document summarizes every cabinet placement and design rule extracted from `CBX_Shotgun.rb` and `CBX_Shotgun_V2_Test.rb`. These rules form the professional standard for the autonomous kitchen layout engine.

---

## 1. Global Project Standards
| Rule Name | Technical Value | Description |
| :--- | :--- | :--- |
| **Global Height** | 2100mm | The default top-alignment line for all vertical units (Tall, Wall, Hood). |
| **Base Height** | 870mm | Default carcass + door height for bottom units. |
| **Wall Height** | 720mm | Default carcass height for top units. |
| **Plinth Height** | 100mm | Distance from floor to the bottom of cabinet bodies. |
| **Countertop** | 40mm | Standard thickness for work surfaces. |

---

## 2. Tall Cabinet Placement
*   **Anchor Positioning**: 
    *   In **Right Corner** mode: Tall unit is placed at **`X = 0`**.
    *   In **Left Corner** mode: Tall unit is placed at **`X = WallLength - Width`**.
*   **Sequential Impact**: If a tall unit is at the start of a wall, all subsequent base and wall cabinets are offset by the tall unit's width.
*   **Height Dominance**: If a tall unit exceeds 2100mm, the global project height is increased to match it.

---

## 3. Base Cabinet Placement (Bottom Row)
*   **Creation Priority**: Units are created in this specific order:
    1.  **Sink Unit**: Centered under windows if present.
    2.  **Cooker Unit**: Placed in the largest remaining gap or near services.
    3.  **Standard Sequence**: User-defined drawers and doors.
    4.  **Auto-Fill**: Remaining space filled with standard widths.
*   **Filling Thresholds**:
    *   System only places cabinets for gaps **≥ 250mm**.
    *   Available standard widths: `[900, 600, 450, 300, 250]`.
*   **Gap Absorption**:
    > [!IMPORTANT]
    > If a remainder gap of **< 250mm** exists after the final cabinet, the Ruby code **does not** create a filler. It adds that remainder width to the **Corner Cabinet** at the end of the run to ensure a flush wall finish.

---

## 4. Wall Cabinet Placement (Top Row)
*   **Top-Line Flushness**: The `Z-position` (elevation) of every unit is calculated as:  
    `Elevation = GlobalHeight - CarcassHeight`.
*   **Cooker Hood Elevation**:
    *   Hoods are 150mm shorter than standard wall units.
    *   **Rule**: The hood is raised by the height difference (150mm) so its top aligns with the rest of the row while providing clearance underneath.
*   **Fill Sequence**: `Cooker Hood -> Closed Boxes -> Open Racks -> Auto-Fill Gaps`.

---

## 5. Corner Cabinet Configuration
*   **Base Corner**: 
    *   Footprint Width: **1050mm** (standard) or **900mm** (compact).
    *   Blind Panel Width: **625mm**.
*   **Top (Wall) Corner**:
    *   Footprint Width: **750mm**.
    *   Blind Panel Width: **Depth + 25mm** (usually 375mm for a 350mm depth).
*   **Corner Side**: Determined by `global_corner_position`.

---

## 6. Detailed Clearances & Gaps
| Parameter | Default Value | Description |
| :--- | :--- | :--- |
| **Door Outer Gap** | 3mm | Gap from the edge of the carcass to the edge of the door. |
| **Door Inner Gap** | 3mm | Gap between two doors on a double-door unit. |
| **Side Clearance** | 3mm | Clearance between cabinets for functional door opening. |
| **Groove Depth** | 5mm | Recession depth for back panels. |
| **Panel Thickness** | 18mm | Material thickness for carcass and doors. |

---

## 7. Obstacle & Window Logic
*   **Window Sill Height**: Typically set to **1050mm** to clear the 910mm combined height of the plinth, base unit, and countertop.
*   **Blocking**: 
    *   Windows block **Wall** and **Tall** units entirely.
    *   Windows only block **Base** units if the `sillHeight` is lower than the `baseHeight`.
