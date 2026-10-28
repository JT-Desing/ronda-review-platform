// Validate before handing untrusted timestamps to PostgreSQL. Date.parse alone
// rolls impossible dates such as February 30 into the following month.
export function validCommentCursorTime(value){
 if(typeof value!=='string')return false;
 const parts=/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4])(?::?[0-5]\d)?)$/.exec(value);
 if(!parts||!Number.isFinite(Date.parse(value)))return false;
 const [,year,month,day,hour,minute,second]=parts.map(Number);
 if(year<1||month<1||month>12||day<1||hour>23||minute>59||second>59)return false;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 return day<=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
