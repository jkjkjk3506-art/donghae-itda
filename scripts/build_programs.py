import sys,json,collections
P=json.load(open(sys.argv[1]))['programs']
BUSINESS={'DH-011','DH-012','GW-001','GW-002','PB-001','WK-001'}
FACILITY_B={'어린이집','노인장애인시설','지역아동센터','사회복지시설','경로당공공시설','문화유산','공장사업장','건설현장'}
STORE_B={'상가영업장','숙박업','건설현장'}
INFO={'CC-004','LW-001','NA-004'}
REQ={'NA-001':['low_income'],'NA-002':['low_income'],'NA-003':['low_income'],'NA-005':['disabled','low_income'],
 'NA-006':['senior'],'DH-013':['low_income','senior'],'PB-004':['low_income'],'NA-011':['senior','low_income'],
 'DH-005':['district:송정동'],'DH-006':['district:묵호동'],'DH-007':['district:송정동'],'DH-004':['rural'],
 'NA-019':['rural'],'NA-020':['rural'],'GW-002':['youth']}
out=[]
for p in P:
    g=p.get; b=set(g('building_types') or [])
    if p['id'] in BUSINESS: aud='business'
    elif p['id'] in INFO: aud='info'
    elif b and b<=FACILITY_B: aud='facility'
    elif b and b<=STORE_B: aud='store'
    else: aud='citizen'
    out.append(dict(id=p['id'],name=p['name'],level=g('level'),operator=g('operator'),audience=aud,donghae_status=g('donghae_status'),
      verification_status=g('verification_status'),work_types=g('work_types') or [],building_types=list(b),support_type=g('support_type') or [],
      requires=REQ.get(p['id'],[]),amount_text=g('amount_text'),max_krw=g('max_krw'),eligibility=g('eligibility'),schedule_2026=g('schedule_2026'),
      expected_next=g('expected_next'),apply_where=g('apply_where'),contact=g('contact'),contractor_opportunity=g('contractor_opportunity'),
      keywords=g('keywords') or [],official_source_url=g('official_source_url') or [],verified_note=g('verified_note'),verified_date=g('verified_date')))
json.dump(out,open('programs.json','w'),ensure_ascii=False)
print(collections.Counter(o['audience'] for o in out)); print('no contact:',[o['id'] for o in out if not o['contact']])
