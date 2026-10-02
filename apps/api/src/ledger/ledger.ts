import { fail } from '../common/errors';
import { type Tx } from '../common/db';
export type Posting={account:string;debit?:bigint;credit?:bigint};
export async function post(tx:Tx,source:string,description:string,lines:Posting[],sanatoriumId?:string,bookingId?:string){
  const debits=lines.reduce((n,l)=>n+(l.debit??0n),0n);const credits=lines.reduce((n,l)=>n+(l.credit??0n),0n);
  if(debits!==credits||debits<=0n||lines.some(l=>(l.debit??0n)<0n||(l.credit??0n)<0n||((l.debit??0n)>0n&&(l.credit??0n)>0n)))fail('LEDGER_UNBALANCED','Hisob-kitob yozuvi teng emas',500);
  const existing=await tx.ledgerJournal.findUnique({where:{source}});if(existing)return existing;
  const journal=await tx.ledgerJournal.create({data:{source,description,sanatoriumId,bookingId}});
  await tx.ledgerLine.createMany({data:lines.map(l=>({journalId:journal.id,account:l.account,debit:l.debit??0n,credit:l.credit??0n}))});return journal;
}
export async function bookingBalance(tx:Tx,bookingId:string,account:string){const journals=await tx.ledgerJournal.findMany({where:{bookingId},select:{id:true}});const total=await tx.ledgerLine.aggregate({where:{journalId:{in:journals.map(j=>j.id)},account},_sum:{debit:true,credit:true}});return(total._sum.credit??0n)-(total._sum.debit??0n);}
