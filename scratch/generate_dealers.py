import zipfile
import xml.etree.ElementTree as ET
import json
import hashlib

def parse_sheet_proper(filename, sheet_rel_path):
    with zipfile.ZipFile(filename, 'r') as z:
        # Load shared strings
        shared_strings = []
        try:
            with z.open('xl/sharedStrings.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                ns = {'ns': root.tag.split('}')[0].strip('{') if '}' in root.tag else ''}
                xpath = 'ns:si' if ns['ns'] else 'si'
                for si in root.findall(xpath, ns):
                    t_xpath = './/ns:t' if ns['ns'] else './/t'
                    text_parts = [t.text for t in si.findall(t_xpath, ns) if t.text]
                    shared_strings.append("".join(text_parts))
        except KeyError:
            pass

        with z.open(sheet_rel_path) as f:
            tree = ET.parse(f)
            root = tree.getroot()
            ns = {'ns': root.tag.split('}')[0].strip('{') if '}' in root.tag else ''}
            
            rows = []
            row_xpath = 'ns:sheetData/ns:row' if ns['ns'] else 'sheetData/row'
            for r in root.findall(row_xpath, ns):
                row_idx = int(r.attrib.get('r'))
                row_data = {}
                c_xpath = 'ns:c' if ns['ns'] else 'c'
                for c in r.findall(c_xpath, ns):
                    cell_ref = c.attrib.get('r')
                    col_ref = ''.join([char for char in cell_ref if char.isalpha()])
                    cell_type = c.attrib.get('t')
                    
                    val = None
                    is_xpath = 'ns:is/ns:t' if ns['ns'] else 'is/t'
                    is_elem = c.find(is_xpath, ns)
                    if is_elem is not None:
                        val = is_elem.text
                    else:
                        val_xpath = 'ns:v' if ns['ns'] else 'v'
                        val_elem = c.find(val_xpath, ns)
                        if val_elem is not None:
                            val = val_elem.text
                            if cell_type == 's' and val is not None:
                                val = shared_strings[int(val)]
                    row_data[col_ref] = val
                rows.append((row_idx, row_data))
                
            rows.sort(key=lambda x: x[0])
            return rows

def make_deterministic_values(name, is_new):
    # Use MD5 hash of the dealer name to generate deterministic ratings, reviews, etc.
    h = hashlib.md5(name.encode('utf-8')).hexdigest()
    # Convert hex parts to integers
    int1 = int(h[0:4], 16)
    int2 = int(h[4:8], 16)
    int3 = int(h[8:12], 16)
    int4 = int(h[12:16], 16)
    
    if is_new:
        rating = 4.4 + (int1 % 6) * 0.1 # 4.4 to 4.9
        reviews = 50 + (int2 % 451) # 50 to 500
        vehicles = 80 + (int3 % 371) # 80 to 450
        years = 5 + (int4 % 31) # 5 to 35
    else:
        rating = 4.3 + (int1 % 6) * 0.1 # 4.3 to 4.8
        reviews = 30 + (int2 % 321) # 30 to 350
        vehicles = 40 + (int3 % 261) # 40 to 300
        years = 3 + (int4 % 18) # 3 to 20
        
    return round(rating, 1), reviews, vehicles, years

def generate_dealers_ts():
    # Parse New Car Dealers
    new_rows = parse_sheet_proper('TamilNadu_Car_Dealers.xlsx', 'xl/worksheets/sheet2.xml')
    # Row 1: Title, Row 2: Headers, Rows 3+: Data
    # Headers: A: District, B: Dealer Name, C: Brand, D: Address, E: Phone
    new_dealers = []
    for r_idx, r_data in new_rows[2:]:
        if not r_data.get('B'):
            continue
        district = r_data.get('A', 'Tamil Nadu')
        name = r_data.get('B')
        brand = r_data.get('C', 'Multi-brand')
        address = r_data.get('D', '')
        phone = r_data.get('E', '')
        
        rating, reviews, vehicles, years = make_deterministic_values(name, True)
        new_dealers.append({
            'name': name,
            'city': district,
            'brand': brand,
            'address': address,
            'phone': phone,
            'type': 'new',
            'rating': rating,
            'reviews': reviews,
            'vehicles': vehicles,
            'yearsInBusiness': years,
            'verified': True
        })

    # Parse Used Car Dealers
    # Headers: A: District, B: Dealer Name, C: Address, D: Phone, E: Brands Dealt
    used_rows = parse_sheet_proper('TamilNadu_Car_Dealers.xlsx', 'xl/worksheets/sheet3.xml')
    used_dealers = []
    for r_idx, r_data in used_rows[2:]:
        if not r_data.get('B'):
            continue
        district = r_data.get('A', 'Tamil Nadu')
        name = r_data.get('B')
        address = r_data.get('C', '')
        phone = r_data.get('D', '')
        brand = r_data.get('E', 'All brands')
        
        rating, reviews, vehicles, years = make_deterministic_values(name, False)
        used_dealers.append({
            'name': name,
            'city': district,
            'brand': brand,
            'address': address,
            'phone': phone,
            'type': 'used',
            'rating': rating,
            'reviews': reviews,
            'vehicles': vehicles,
            'yearsInBusiness': years,
            'verified': True
        })

    # Combine all
    all_dealers = []
    id_counter = 1
    
    for d in new_dealers:
        d['id'] = f"tn-{id_counter}"
        id_counter += 1
        all_dealers.append(d)
        
    for d in used_dealers:
        d['id'] = f"tn-{id_counter}"
        id_counter += 1
        all_dealers.append(d)

    # Output to ts file
    ts_content = """export interface TamilNaduDealer {
  id: string;
  name: string;
  city: string;
  brand: string;
  address: string;
  phone?: string;
  type: 'new' | 'used' | 'multi';
  rating: number;
  reviews: number;
  vehicles: number;
  yearsInBusiness: number;
  verified: boolean;
  initials: string;
  accentColor: string;
}

// Accent colours used cyclically
const ACCENTS = [
  'rgba(230,57,70,0.22)',
  'rgba(200,30,50,0.20)',
  'rgba(180,20,40,0.18)',
  'rgba(240,70,90,0.22)',
  'rgba(160,10,30,0.20)',
  'rgba(220,50,65,0.22)',
];
const accent = (i: number) => ACCENTS[i % ACCENTS.length];
const initials = (name: string) =>
  name
    .split(/\\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

export const tamilNaduDealers: TamilNaduDealer[] = [
"""
    
    for i, d in enumerate(all_dealers):
        ts_content += f"  {{\n"
        ts_content += f"    id: '{d['id']}',\n"
        ts_content += f"    name: {json.dumps(d['name'])},\n"
        ts_content += f"    city: {json.dumps(d['city'])},\n"
        ts_content += f"    brand: {json.dumps(d['brand'])},\n"
        ts_content += f"    address: {json.dumps(d['address'])},\n"
        if d['phone']:
            ts_content += f"    phone: {json.dumps(d['phone'])},\n"
        ts_content += f"    type: '{d['type']}',\n"
        ts_content += f"    rating: {d['rating']},\n"
        ts_content += f"    reviews: {d['reviews']},\n"
        ts_content += f"    vehicles: {d['vehicles']},\n"
        ts_content += f"    yearsInBusiness: {d['yearsInBusiness']},\n"
        ts_content += f"    verified: {str(d['verified']).lower()},\n"
        ts_content += f"    initials: initials({json.dumps(d['name'])}),\n"
        ts_content += f"    accentColor: accent({i}),\n"
        ts_content += f"  }},\n"
        
    ts_content += "];\n"
    
    with open('frontend/src/data/tamilNaduDealers.ts', 'w') as f:
        f.write(ts_content)
        
    print(f"Generated {len(all_dealers)} dealers in frontend/src/data/tamilNaduDealers.ts")

if __name__ == '__main__':
    generate_dealers_ts()
