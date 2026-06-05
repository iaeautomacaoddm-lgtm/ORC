import { spawn } from 'child_process';

export async function POST(request: Request) {
  try {
    const { command, cwd } = await request.json();
    
    if (!command) {
      return new Response(JSON.stringify({ error: 'Comando é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Spawn shell process to execute the command on Windows
        const child = spawn(command, {
          cwd: cwd || process.cwd(),
          shell: true,
          env: { ...process.env }
        });

        // Enqueue the PID of the spawned process
        controller.enqueue(encoder.encode(JSON.stringify({ type: 'pid', data: child.pid }) + '\n'));

        child.stdout.on('data', (data) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'stdout', data: data.toString() }) + '\n'));
        });

        child.stderr.on('data', (data) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'stderr', data: data.toString() }) + '\n'));
        });

        child.on('close', (code) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'exit', data: code }) + '\n'));
          controller.close();
        });

        child.on('error', (err) => {
          controller.enqueue(encoder.encode(JSON.stringify({ type: 'error', data: err.message }) + '\n'));
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
