import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: Request) {
  try {
    const { pid } = await request.json();
    if (!pid) {
      return NextResponse.json({ error: 'PID é obrigatório' }, { status: 400 });
    }

    // Force termination of the process tree on Windows
    await execPromise(`taskkill /F /T /PID ${pid}`);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
