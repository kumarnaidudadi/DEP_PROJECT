const fs = require('fs');
const file = '/Users/tharun/DEP_PROJECT/client/app/dashboard/statistics/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Revert searchQuery back to filterIp and add filterUser text query logic
content = content.replace(/const \[searchQuery, setSearchQuery\] = useState\(''\);/, `const [filterIp, setFilterIp] = useState('');\n    const [userSearch, setUserSearch] = useState('');\n    const [userDropdownOpen, setUserDropdownOpen] = useState(false);`);

content = content.replace(/if \(searchQuery\) \{[\s\S]*?\} else if \(filterUser !== 'all'\) \{/g, `if (filterIp) {
                    endpoint = '/statistics/ip';
                    params.ipAddress = filterIp;
                    setViewMode('ip');
                } else if (filterUser !== 'all') {`);

content = content.replace(/dateFrom, dateTo, singleDate, timeFrom, timeTo, filterUser, searchQuery, userRoles, users/g, `dateFrom, dateTo, singleDate, timeFrom, timeTo, filterUser, filterIp, userRoles`);

content = content.replace(/setFilterUser\('all'\);\n        setSearchQuery\(''\);/, `setFilterUser('all');\n        setFilterIp('');\n        setUserSearch('');`);

// 2. Replace the old Export CSV + Search div
content = content.replace(/<div style=\{\{ display: 'flex', alignItems: 'center', gap: '12px' \}\}>[\s\S]*?Export CSV[\s\S]*?<\/button>\s*<div style=\{\{[\s\S]*?<Search size=\{14\}[\s\S]*?<input[\s\S]*?\/>\s*<\/div>\s*<\/div>\s*<\/div>/, `<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Export Button */}
                        <button
                            onClick={() => {
                                if (!stats) return;
                                let csv = '';
                                if (viewMode === 'general') {
                                    csv += 'Date,Actions Count\\n';
                                    stats.dailyBreakdown?.forEach((d: any) => csv += \`\${d.date},\${d.count}\\n\`);
                                } else if (viewMode === 'user') {
                                    csv += 'Action,Form Type,Form Ref,Date,Status\\n';
                                    stats.timeline?.forEach((t: any) => csv += \`\${t.action},\${t.formType},\${t.formRef || ''},\${t.date},\${t.formStatus}\\n\`);
                                } else if (viewMode === 'ip') {
                                    csv += 'Action,User,Form Ref,Date\\n';
                                    stats.recentActions?.forEach((a: any) => csv += \`\${a.action},\${a.user},\${a.formRef || ''},\${a.date}\\n\`);
                                }
                                const blob = new Blob([csv], { type: 'text/csv' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = \`statistics_export_\${new Date().toISOString().split('T')[0]}.csv\`;
                                a.click();
                            }}
                            style={{
                                padding: '8px 14px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
                                fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export CSV
                        </button>

                        {/* Separate IP Search */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '8px 14px', width: '220px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}>
                                <Globe size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                <input
                                    value={filterIp}
                                    onChange={e => { setFilterIp(e.target.value); if(e.target.value) { setFilterUser('all'); setUserSearch(''); } }}
                                    placeholder="Search IP address..."
                                    style={{
                                        border: 'none', outline: 'none', background: 'transparent',
                                        fontSize: '13px', color: '#374151', width: '100%',
                                    }}
                                />
                            </div>
                            {filterIp && viewMode !== 'ip' && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, padding: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', fontSize: '12px', color: '#64748b' }}>
                                    Press Enter or wait to search for IP: {filterIp}
                                </div>
                            )}
                        </div>

                        {/* Separate User Autocomplete */}
                        <div style={{ position: 'relative' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: '#f8fafc', border: '1px solid #e2e8f0',
                                borderRadius: '8px', padding: '8px 14px', width: '250px',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}>
                                <User size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                                <input
                                    value={userSearch}
                                    onChange={e => { setUserSearch(e.target.value); setUserDropdownOpen(true); }}
                                    onFocus={() => setUserDropdownOpen(true)}
                                    onBlur={() => setTimeout(() => setUserDropdownOpen(false), 200)}
                                    placeholder="Search User or Email..."
                                    style={{
                                        border: 'none', outline: 'none', background: 'transparent',
                                        fontSize: '13px', color: '#374151', width: '100%',
                                    }}
                                />
                            </div>
                            {userDropdownOpen && userSearch && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '300px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                    {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                                        <div 
                                            key={u.id}
                                            onClick={() => { setFilterUser(u.id.toString()); setUserSearch(u.name); setFilterIp(''); setUserDropdownOpen(false); }}
                                            style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }}
                                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8fafc'}
                                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{u.name}</div>
                                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                                        </div>
                                    ))}
                                    {users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())).length === 0 && (
                                        <div style={{ padding: '10px 14px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No users found</div>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>`);

// Remove old Dropdown for users
content = content.replace(/<Dropdown\s*label="All Users"[\s\S]*?minWidth=\{160\}\s*\/>/, '');

// Replace filterIp back in handleReset if it missed
content = content.replace(/filterUser !== 'all' \|\| searchQuery/g, `filterUser !== 'all' || filterIp || userSearch`);

fs.writeFileSync(file, content);
