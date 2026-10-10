import {publicMarkdown} from '@/lib/publicMarkdown';
export const dynamic = 'force-dynamic';
export function GET(request: Request) {
 const path=new URL(request.url).searchParams.get('path') || '/';
 const body=publicMarkdown(path);
 return new Response(body || '# Page not found\n\nThis public page does not exist. Browse [Loki’s Lab](https://lokislab.org/), the [sitemap](https://lokislab.org/sitemap.xml), or the [source index](https://lokislab.org/llms.txt).\n',{status:body?200:404,headers:{'Content-Type':'text/markdown; charset=utf-8','Vary':'Accept','Cache-Control':'private, no-store'}});
}
