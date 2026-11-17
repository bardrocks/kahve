// D1 benzeri arayüz (prepare/bind/first/all/run, batch) — Postgres (pg.Pool uyumlu) üzerinde.
export function toPg(sql){
  let out='',n=0,i=0;
  while(i<sql.length){
    const c=sql[i];
    if(c==="'"){let j=i+1;while(j<sql.length){if(sql[j]==="'"){if(sql[j+1]==="'"){j+=2;continue}break}j++}out+=sql.slice(i,j+1);i=j+1;continue}
    if(c==='?'){out+='$'+(++n);i++;continue}
    out+=c;i++;
  }
  if(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(out))out=out.replace(/^(\s*)INSERT\s+OR\s+IGNORE\s+INTO\b/i,'$1INSERT INTO').replace(/\s*;?\s*$/,' ON CONFLICT DO NOTHING');
  return out;
}
const runResult=r=>({success:true,results:[],meta:{changes:r.rowCount??0},changes:r.rowCount??0});
export function createPgD1(pool){
  const make=(sql,args)=>({
    _sql:sql,_args:args,
    bind(...v){return make(sql,v)},
    async first(){const r=await pool.query(toPg(sql),args);return r.rows[0]??null},
    async all(){const r=await pool.query(toPg(sql),args);return {results:r.rows,success:true}},
    async run(){return runResult(await pool.query(toPg(sql),args))},
  });
  return {
    prepare(sql){return make(sql,[])},
    async batch(stmts){
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        const out=[];
        for(const s of stmts)out.push(runResult(await client.query(toPg(s._sql),s._args)));
        await client.query('COMMIT');
        return out;
      }catch(e){
        try{await client.query('ROLLBACK')}catch{}
        throw e;
      }finally{client.release()}
    },
  };
}
