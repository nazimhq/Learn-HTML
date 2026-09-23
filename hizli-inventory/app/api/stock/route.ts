import {NextRequest,NextResponse} from 'next/server';import {z} from 'zod';
const schema=z.object({productId:z.string(),quantity:z.number().int().positive(),type:z.enum(['RECEIVE','SALE','DAMAGE','MOVE','ADJUST']),reason:z.string().min(2)});
export async function POST(req:NextRequest){const body=await req.json();const parsed=schema.safeParse(body);if(!parsed.success)return NextResponse.json({error:parsed.error.flatten()},{status:400});return NextResponse.json({ok:true,message:'Demo route validated. In production, execute the supplied PostgreSQL stock transaction function.'})}
