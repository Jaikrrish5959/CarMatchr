import zipfile
import xml.etree.ElementTree as ET
import json

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
                    # First check inlineStr
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

if __name__ == '__main__':
    for sheet_num, name in [('2', 'New Car Dealers'), ('3', 'Used Car Dealers')]:
        print(f"=== {name} (sheet{sheet_num}.xml) ===")
        rows = parse_sheet_proper('TamilNadu_Car_Dealers.xlsx', f'xl/worksheets/sheet{sheet_num}.xml')
        print(f"Total rows: {len(rows)}")
        # Print first 5 non-empty rows
        count = 0
        for r_idx, r_data in rows:
            if any(v is not None for v in r_data.values()):
                print(f"Row {r_idx}: {r_data}")
                count += 1
                if count >= 10:
                    break
