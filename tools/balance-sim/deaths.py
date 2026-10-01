import json, collections, sys
tag,n=sys.argv[1],int(sys.argv[2])
rs=[json.load(open(f'out_{tag}_{i}.json'))[0] for i in range(1,n+1)]
d=[r for r in rs if not r['win']]
b=collections.Counter('<4m' if r['t']<240 else '4-6m' if r['t']<360 else '6-9m' if r['t']<540 else '9-12m' if r['t']<720 else '12-15m' for r in d)
k=collections.Counter((max(r['last'].items(), key=lambda x:x[1])[0].split(':')[0] if r['last'] else '?') for r in d)
print(f"{tag}: win {sum(r['win'] for r in rs)}/{n}  deaths {dict(sorted(b.items()))}  killers {dict(k)}")
