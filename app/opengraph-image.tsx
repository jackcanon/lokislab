import { ImageResponse } from 'next/og';
export const alt = "Loki's Lab — Independent testing, practical guides and people to follow";
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(<div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',width:'100%',height:'100%',background:'#ece5d8',color:'#17201f',padding:'64px'}}>
    <div style={{display:'flex',fontSize:28,letterSpacing:4,color:'#b74627'}}>INDEPENDENT · PRACTICAL · SOURCE-LINKED</div>
    <div style={{display:'flex',fontFamily:'serif',fontSize:110}}>Loki’s Lab<span style={{color:'#b74627'}}>.</span></div>
    <div style={{display:'flex',fontSize:34,maxWidth:950}}>Artificial intelligence, tested. Guides, evidence and the people behind the progress.</div>
    <div style={{display:'flex',fontSize:24}}>lokislab.org</div>
  </div>, size);
}
