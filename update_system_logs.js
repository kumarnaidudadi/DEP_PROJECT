const fs = require('fs');
const file = '/Users/tharun/DEP_PROJECT/client/app/dashboard/system-logs/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[searchQuery, setSearchQuery\] = useState\(''\);/, `const [searchQuery, setSearchQuery] = useState('');\n    const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);`);

content = content.replace(/const uniqueActions/, `const suggestions = searchQuery ? Array.from(new Set(
        filtered.map(l => {
            const q = searchQuery.toLowerCase();
            const name = l.applicant ? \`\${l.applicant.first_name} \${l.applicant.last_name}\`.trim() : 'System';
            if (name.toLowerCase().includes(q)) return name;
            if (l.reference_number?.toLowerCase().includes(q)) return l.reference_number;
            if (l.form_type_name?.toLowerCase().includes(q)) return l.form_type_name;
            return null;
        }).filter(Boolean)
    )).slice(0, 8) as string[] : [];

    const uniqueActions`);

content = content.replace(/\{(\/\* Search \*\/)[\s\S]*?(<div style=\{\{[\s\S]*?display: 'flex', alignItems: 'center', gap: '8px',[\s\S]*?<Search size=\{14\}[\s\S]*?<input[\s\S]*?onChange=\{e => setSearchQuery\(e\.target\.value\)\}[\s\S]*?\/>\s*<\/div>)/, `{$1}
                    <div style={{ position: 'relative' }}>
                        $2
                        {searchDropdownOpen && suggestions.length > 0 && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '250px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                {suggestions.map((s, i) => (
                                    <div 
                                        key={i}
                                        onClick={() => { setSearchQuery(s); setSearchDropdownOpen(false); }}
                                        style={{ padding: '8px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: '13px', color: '#1e293b' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                    >
                                        {s}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>`);

content = content.replace(/onChange=\{e => setSearchQuery\(e\.target\.value\)\}/, `onChange={e => { setSearchQuery(e.target.value); setSearchDropdownOpen(true); }}\n                            onFocus={() => setSearchDropdownOpen(true)}\n                            onBlur={() => setTimeout(() => setSearchDropdownOpen(false), 200)}`);

fs.writeFileSync(file, content);
