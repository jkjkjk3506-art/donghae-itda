import sys, json, collections, openpyxl, re
src=sys.argv[1]; out=sys.argv[2]
REPAIR={'도장·방수·코킹','설비·누수·보일러','인테리어·도배·욕실','창호·유리·금속','전기·통신','종합건설','종합·기타 시공','에어컨·공조·냉동','철거','소방','조경','토목·포장·콘크리트','비계·구조물','간판·광고물','청소·위생','폐기물·고물'}
FAMILY=['방도건설','이원상사']
T={'★★★ 높음':3,'★★ 보통':2,'★ 단일':1}
wb=openpyxl.load_workbook(src,read_only=True,data_only=True)
R=list(wb['전체 목록'].iter_rows(values_only=True))[1:]
rows=[];priv=[];skipped=[]
for r in R:
    (no,name,cat,sub,trust,sc,srcs,_rep,phone,addr,lic,status,bizno,btype,_vf,emp,pw,pwt,_kakao,home,alias,_bolta)=r
    if any(f in (name or '')+(alias or '') for f in FAMILY): skipped.append(name); continue
    t=T.get(trust,1)
    vis = cat in REPAIR and status!='영업정지' and (t>=2 or (bool(phone) and bool(addr)))
    m=re.search(r'([가-힣]+[0-9]*동)(?=[\s,)]|$)',str(addr or ''))
    rows.append(dict(id=no,name=name,category=cat,sub_category=sub,trust_level=t,source_count=sc,sources=srcs,
      phone=phone,address=addr,dong=m.group(1) if m else None,licenses=lic,biz_status=status,biz_type=btype,
      employees=emp if isinstance(emp,int) else None,public_works=pw,public_works_total=pwt or 0,homepage=home,aliases=alias,
      visible=vis,is_newcomer=bool(vis and not (pwt or 0) and t<3)))
    if bizno: priv.append(dict(business_id=no,biz_no=bizno))
json.dump(dict(businesses=rows,private=priv),open(out,'w'),ensure_ascii=False)
v=[x for x in rows if x['visible']]
print('total',len(rows),'visible',len(v),'newcomer',sum(x['is_newcomer'] for x in v),'skipped',skipped)
print(collections.Counter(x['category'] for x in v).most_common())
