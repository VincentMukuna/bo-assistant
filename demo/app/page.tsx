import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Clock3,
  Hammer,
  Leaf,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { SupportStudio } from "@/components/support-studio";

const services = [
  {
    icon: Sparkles,
    number: "01",
    title: "Home cleaning",
    description:
      "Meticulous recurring and deep cleans, tailored to your home, your routines, and your preferences.",
    detail: "From $145",
    className: "service-card service-card--sage",
  },
  {
    icon: Hammer,
    number: "02",
    title: "Repairs & upkeep",
    description:
      "Skilled help for the fixes that keep getting postponed—from leaky taps to tired doors and walls.",
    detail: "From $95/hr",
    className: "service-card service-card--cream",
  },
  {
    icon: Leaf,
    number: "03",
    title: "Whole-home care",
    description:
      "A simple monthly plan combining preventative maintenance, priority booking, and seasonal care.",
    detail: "From $189/mo",
    className: "service-card service-card--clay",
  },
];

const steps = [
  ["Tell us what you need", "Share a few details online or by text. Photos are welcome, but never required."],
  ["Choose a time", "See clear availability and a straightforward estimate before you confirm."],
  ["Consider it handled", "A trusted Oak & Pine professional arrives prepared and keeps you updated."],
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Oak and Pine home">
          <span className="brand-mark" aria-hidden="true">
            <Leaf size={20} strokeWidth={2.2} />
          </span>
          <span>Oak <i>&</i> Pine</span>
        </a>

        <nav className="desktop-nav" aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="#how-it-works">How it works</a>
          <a href="#reviews">Reviews</a>
          <a href="#support">Customer support</a>
        </nav>

        <a className="header-cta" href="#support">
          Get started <ArrowRight size={16} />
        </a>
        <a className="mobile-menu" href="#support" aria-label="Go to customer support">
          <MessageCircle size={21} />
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <h1>
            Home care,
            <br />
            <em>beautifully handled.</em>
          </h1>
          <p className="hero-lede">
            Cleaning, repairs, and everyday upkeep from one thoughtful team—so your home gets the care it
            deserves, without the runaround.
          </p>
          <div className="hero-actions">
            <a className="button button--primary" href="#support">
              Book a service <ArrowRight size={17} />
            </a>
            <a className="text-link" href="#services">
              Explore our services <span aria-hidden="true">↘</span>
            </a>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack" aria-hidden="true">
              <span>KL</span>
              <span>JR</span>
              <span>NA</span>
            </div>
            <div>
              <div className="stars" role="img" aria-label="Five out of five stars">
                {[0, 1, 2, 3, 4].map((star) => (
                  <Star key={star} size={13} fill="currentColor" />
                ))}
              </div>
              <p>Loved by 800+ local homeowners</p>
            </div>
          </div>
        </div>

        <div className="hero-visual" role="img" aria-label="A calm, cared-for living room illustration">
          <div className="sun-shape" />
          <div className="window-scene">
            <span className="window-line window-line--v" />
            <span className="window-line window-line--h" />
            <div className="hill hill--back" />
            <div className="hill hill--front" />
          </div>
          <div className="plant">
            <span className="plant-leaf plant-leaf--one" />
            <span className="plant-leaf plant-leaf--two" />
            <span className="plant-leaf plant-leaf--three" />
            <span className="plant-stem" />
            <span className="plant-pot" />
          </div>
          <div className="sofa">
            <span className="sofa-back" />
            <span className="sofa-seat" />
            <span className="sofa-arm sofa-arm--left" />
            <span className="sofa-arm sofa-arm--right" />
            <span className="sofa-cushion sofa-cushion--one" />
            <span className="sofa-cushion sofa-cushion--two" />
            <span className="sofa-leg sofa-leg--left" />
            <span className="sofa-leg sofa-leg--right" />
          </div>
          <div className="appointment-card">
            <span className="appointment-icon">
              <CalendarCheck2 size={19} />
            </span>
            <span>
              <small>Next visit</small>
              <strong>Tuesday, 2:30 PM</strong>
              <em><Check size={11} /> Confirmed</em>
            </span>
          </div>
          <span className="visual-caption">Care you can feel at home</span>
        </div>
      </section>

      <section className="trust-strip" aria-label="Service promises">
        <p><ShieldCheck size={18} /> Vetted professionals</p>
        <p><Clock3 size={18} /> On-time promise</p>
        <p><MessageCircle size={18} /> Real human support</p>
        <p><Leaf size={18} /> Thoughtful products</p>
      </section>

      <section className="section services-section" id="services">
        <div className="section-heading">
          <div>
            <h2>One trusted team.<br /><em>Everyday peace of mind.</em></h2>
          </div>
          <p>
            From weekly upkeep to the unexpected fix, we make looking after your home feel refreshingly
            simple.
          </p>
        </div>

        <div className="service-grid">
          {services.map(({ icon: Icon, ...service }) => (
            <article className={service.className} key={service.title}>
              <div className="service-card__top">
                <span className="service-icon"><Icon size={24} /></span>
                <span className="service-number">{service.number}</span>
              </div>
              <div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
              </div>
              <div className="service-card__footer">
                <span>{service.detail}</span>
                <span className="circle-arrow" aria-hidden="true"><ArrowRight size={17} /></span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="process-intro">
          <h2>A better way to<br /><em>care for home.</em></h2>
          <p>Clear communication, respectful professionals, and no surprises. That is the whole idea.</p>
          <div className="process-stat">
            <strong>4.9</strong>
            <span><span className="stars">★★★★★</span><br />Average customer rating</span>
          </div>
        </div>
        <ol className="process-list">
          {steps.map(([title, description], index) => (
            <li key={title}>
              <span className="step-number">0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="testimonial-section" id="reviews">
        <div className="quote-mark" aria-hidden="true">“</div>
        <blockquote>
          Oak & Pine is the first home service I never have to chase. They remember the little things,
          communicate clearly, and leave everything better than they found it.
        </blockquote>
        <div className="reviewer">
          <span className="reviewer-avatar">AM</span>
          <span><strong>Alice Morgan</strong><small>Oak & Pine customer since 2024</small></span>
        </div>
      </section>

      <section className="support-section" id="support">
        <div className="support-section__heading">
          <div>
            <h2>Help is already<br /><em>on the way.</em></h2>
          </div>
          <div className="support-copy">
            <p>
              This customer area is a local demo environment. Create, continue, close, and clear support
              conversations as Alice Morgan—no API or live team is connected yet.
            </p>
            <SupportStudio />
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand">
          <a className="brand brand--light" href="#top">
            <span className="brand-mark brand-mark--light"><Leaf size={20} /></span>
            <span>Oak <i>&</i> Pine</span>
          </a>
          <p>Thoughtful care for San Francisco homes.</p>
        </div>
        <div className="footer-links">
          <div><strong>Services</strong><a href="#services">Home cleaning</a><a href="#services">Repairs & upkeep</a><a href="#services">Home care plans</a></div>
          <div><strong>Company</strong><a href="#how-it-works">How it works</a><a href="#reviews">Our customers</a><a href="#support">Support</a></div>
          <div><strong>Contact</strong><a href="tel:+14155550140">(415) 555-0140</a><a href="mailto:hello@oakandpine.test">hello@oakandpine.test</a><span>Mon–Sat, 8am–6pm</span></div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Oak & Pine Home Services</span>
          <span>Demo company · San Francisco, CA</span>
        </div>
      </footer>
    </main>
  );
}
