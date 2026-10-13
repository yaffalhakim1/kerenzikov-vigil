var e=`attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`,t={mode:[0,7],x:[-.9,.9],y:[-.6,.6],size:[-1,1.5],spread:[.3,2.5],lobes:[2,12],twist:[-1,1],warp:[0,1],cell:[1,4],levels:[3,12],speed:[0,1],seed:[0,2e3]},n=`precision highp float;
uniform vec2 uRes;uniform vec3 uC0,uC1,uC2,uC3;uniform float uTime,uDpr;
${Object.keys(t).map(e=>`uniform float u_${e};`).join(``)}
const float u_heat=1.25,u_vignette=0.,u_weave=0.;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p);p=p*2.03+13.7;a*=.5;}return v;}
float dBayer2(vec2 a){ a=floor(a); return fract(a.x*.5+a.y*a.y*.75); }
float dBayer4(vec2 a){ return dBayer2(.5*a)*.25+dBayer2(a); }
vec3 dLights(vec2 p, float t, float seed){
  float w=u_spread;
  vec2 c=vec2(u_x,u_y);
  float wob=(fbm(p*1.3+vec2(seed,t*.08))-.5)*u_warp;
  vec3 L=vec3(0.);
  if(u_mode<.5){ // arc: a dark body with a burning rim
    float d=length((p-c)/vec2(1.5,1.))-u_size+wob*.5;
    L.x=exp(-pow(d/(.05*w),2.));
    L.y=exp(-pow((d-.05*w)/(.17*w),2.))*.9;
    L.z=smoothstep(0.,.7,d)*.35;
  } else if(u_mode<1.5){ // burst: blurred petals of different colours round a hot core
    vec2 q=p-c; float r=length(q), th=atan(q.y,q.x);
    float pet=pow(.5+.5*cos(u_lobes*th+r*u_twist*6.+wob*4.+t*.08),1.+3.*max(u_size,0.));
    float fall=exp(-r*r/(w*w*.35));
    L=pet*fall*1.5*pow(.5+.5*cos(th*2.+seed+t*.05+vec3(0.,2.1,4.2)),vec3(2.5)); // each petal leans to one colour
    L+=exp(-r*r/(w*w*.012))*.7;
  } else if(u_mode<2.5){ // horizon: a bright line with one colour above and one below
    float h=p.y-c.y+u_size*p.x*p.x+wob*.4+.07*sin(t*.25+seed); // the horizon rises and falls a little
    L.x=exp(-pow(h/(.09*w),2.));
    L.y=smoothstep(.02,-.3*w,h);
    L.z=smoothstep(-.02,.32*w,h);
  } else if(u_mode<3.5){ // drapes: mirrored curtains over a glowing floor
    vec2 q=vec2(abs(p.x-c.x),p.y-c.y);
    float sway=.12*sin(q.y*3.+t*.12+seed)+wob*.3;
    L.x=exp(-pow((q.x-.42*w-sway)/(.13*w),2.))*smoothstep(.6,-.05,q.y);
    L.y=exp(-pow((q.x-.2*w+sway)/(.1*w),2.))*smoothstep(.2,-.45,q.y);
    L.z=exp(-(q.y+.5)*5.5)*.8;
  } else if(u_mode<4.5){ // smear: long streaks of light dragged along one direction
    vec2 q=vec2(p.x*.55,p.y*3.2);
    L.x=smoothstep(.5,.72,fbm(q+vec2(t*.04+seed,0.)));
    L.y=smoothstep(.4,.62,fbm(q*1.3+vec2(seed*1.7-t*.03,4.)));
    L.z=smoothstep(.38,.6,fbm(q*.7+vec2(9.,seed+t*.02)));
    L*=1.2;
  } else if(u_mode<5.5){ // veil: two soft washes (uC2, uC3) and one thin leak of light (uC1)
    L.y=smoothstep(.3,.62,fbm(p*1.1+vec2(seed,t*.06)));
    L.z=smoothstep(.34,.66,fbm(p*.9+vec2(seed+5.,-t*.05)));
    float line=p.y-c.y-.35*p.x+.12*sin(p.x*3.+t*.2)+wob*.3;
    L.x=exp(-pow(line/(.06*w),2.))*.85; // the leak lies over both washes
  } else if(u_mode<6.5){ // spikes: a band of light with icicles hanging from it (uC1), a second light above (uC2)
    float h=p.y-c.y, xi=p.x*u_lobes+seed, id=floor(xi), fx=fract(xi)-.5;
    float len=(.15+.85*hash(vec2(id,seed)))*u_size*(1.+.3*sin(t*.4+id*1.7)); // each icicle grows and shrinks on its own
    float tip=clamp(1.+h/len,0.,1.); // 1 at the band, 0 at the tip
    float spike=exp(-pow((fx-(hash(vec2(id,seed+3.))-.5)*.5)/(.06+.2*tip),2.))*tip*(1.-smoothstep(0.,.08,h));
    L.x=exp(-pow((h-.06+wob*.2)/(.1*w),2.))+spike;
    L.y=smoothstep(.1,.32*w,h+wob*.2);
  } else { // rays: streaks of light pulled outward from one point
    vec2 q=p-c; float r=length(q); vec2 dir=q/max(r,.001);
    float a1=fbm(dir*u_lobes+seed+vec2(t*.03,0.)), a2=fbm(dir*u_lobes*1.7+seed+9.-vec2(0.,t*.025));
    float open=smoothstep(.02,.6*w,r);
    L=vec3(smoothstep(.5,.75,a1),smoothstep(.42,.7,a2)*.9,smoothstep(.35,.6,a1)*.5)*open;
  }
  return L;
}
vec3 colour(vec2 uv, vec2 p, float t, float seed){
  vec3 L=dLights(p,t,seed);
  float dark=step(dot(uC0,vec3(1.)),1.4);
  vec3 lit=uC0+(L.x*uC1+L.y*uC2+L.z*uC3)*u_heat;
  lit=min(lit,1.)+dot(max(lit-1.,0.),vec3(.4)); // colours stay pure up to full strength; what spills over burns to white
  lit*=mix(1.,smoothstep(1.15,.35,length(p*vec2(.85,1.25))),u_vignette);
  vec3 pig=mix(mix(mix(uC0,uC3,min(L.z,1.)),uC2,min(L.y,1.)),uC1,min(L.x,1.));
  vec3 col=mix(pig,lit,dark);
  float cell=max(1.,floor(u_cell*uDpr+.5)); // whole device pixels, so the screen is crisp at every pixel ratio
  vec2 thread=abs(fract(gl_FragCoord.xy/(cell*2.))-.5);
  col*=1.-u_weave*.22*smoothstep(.25,.5,max(thread.x,thread.y));
  return clamp(floor(col*u_levels+dBayer4(gl_FragCoord.xy/cell))/u_levels,0.,1.);
}
void main(){vec2 uv=gl_FragCoord.xy/uRes;vec2 p=(uv-.5)*vec2(uRes.x/uRes.y,1.);gl_FragColor=vec4(colour(uv,p,uTime*u_speed,u_seed),1.);}`,r=document.createElement(`canvas`).getContext(`2d`,{willReadFrequently:!0}),i=e=>r?(r.clearRect(0,0,1,1),r.fillStyle=`transparent`,r.fillStyle=e,r.fillRect(0,0,1,1),[...r.getImageData(0,0,1,1).data].slice(0,3).map(e=>e/255)):[0,0,0],a=matchMedia(`(prefers-reduced-motion: reduce)`);for(let r of document.querySelectorAll(`[data-nes="ui/dither-ground"]:not([data-bound])`)){r.dataset.bound=``;let o=r.querySelector(`canvas`),s=JSON.parse(r.dataset.params??`{}`),c=o.getContext(`webgl`,{antialias:!1,alpha:!1,depth:!1,stencil:!1,powerPreference:`low-power`});if(!c)continue;let l=(e,t)=>{let n=c.createShader(e);return c.shaderSource(n,t),c.compileShader(n),c.getShaderParameter(n,c.COMPILE_STATUS)?n:null},u=l(c.VERTEX_SHADER,e),d=l(c.FRAGMENT_SHADER,n),f=c.createProgram();if(!u||!d||!f||(c.attachShader(f,u),c.attachShader(f,d),c.linkProgram(f),!c.getProgramParameter(f,c.LINK_STATUS)))continue;c.useProgram(f),c.bindBuffer(c.ARRAY_BUFFER,c.createBuffer()),c.bufferData(c.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),c.STATIC_DRAW);let p=c.getAttribLocation(f,`a`);c.enableVertexAttribArray(p),c.vertexAttribPointer(p,2,c.FLOAT,!1,0,0);let m=e=>c.getUniformLocation(f,e);for(let[e,[n,r]]of Object.entries(t))c.uniform1f(m(`u_${e}`),Math.min(r,Math.max(n,s[e]??n)));let h=Math.min(1,Math.max(0,Number(r.dataset.strength??1))),g=()=>{let e=getComputedStyle(r),t=i(e.getPropertyValue(`--c0`).trim());[0,1,2,3].forEach(n=>{let r=i(e.getPropertyValue(`--c${n}`).trim());c.uniform3fv(m(`uC${n}`),n?r.map((e,n)=>t[n]+(e-t[n])*h):r)})},_=0,v=0,y=0,b=!1,x=0,S=0,C=()=>{let e=Math.min(devicePixelRatio||1,2),t=Math.round(o.clientWidth*e),n=Math.round(o.clientHeight*e);(t!==x||n!==S)&&(x=o.width=t,S=o.height=n,c.viewport(0,0,x,S),c.uniform2f(m(`uRes`),x,S)),c.uniform1f(m(`uDpr`),e),c.uniform1f(m(`uTime`),_),c.drawArrays(c.TRIANGLES,0,3)},w=e=>{_+=v?Math.min((e-v)/1e3,1/20):0,v=e,C(),y=requestAnimationFrame(w)},T=()=>{cancelAnimationFrame(y),y=0,v=0},E=()=>{T(),b&&!document.hidden&&!a.matches?y=requestAnimationFrame(w):C()};g(),r.dataset.live=``,new IntersectionObserver(e=>{b=e.at(-1)?.isIntersecting??!1,E()}).observe(r),new ResizeObserver(()=>{y||C()}).observe(o),document.addEventListener(`visibilitychange`,E),a.addEventListener(`change`,E),new MutationObserver(()=>{g(),y||C()}).observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`,`class`]})}