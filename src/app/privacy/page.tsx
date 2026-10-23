import type { Metadata } from "next";
import Link from "next/link";
import { LangJump } from "./LangJump";

export const metadata: Metadata = {
  title: "Политика конфиденциальности · Privacy policy — Vladimir",
  description: "Какие данные собирает портфолио ypciiiak.online, зачем и как их удалить.",
  robots: { index: true },
};

const UPDATED = "23.10.2026";
const CONTACT_EMAIL = "bigboyvova01@gmail.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2 text-[16px] font-semibold text-vsc-bright">
        <span className="text-vsc-blue">## </span>
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    // The site locks body scrolling for the IDE layout, so this page scrolls its own container.
    <div className="h-dvh overflow-y-auto bg-vsc-bg text-vsc-text">
      <LangJump />
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-vsc-line bg-vsc-tabbar px-4 text-[13px]">
        <span className="border-t-2 border-vsc-accent bg-vsc-bg px-3 py-2 text-vsc-bright">privacy.md</span>
        <Link href="/" className="text-vsc-muted hover:text-vsc-bright">← На сайт · Back to the site</Link>
        <a href="#en" className="ml-auto text-vsc-muted hover:text-vsc-bright">English</a>
      </div>
    <main className="mx-auto max-w-3xl px-5 py-10 text-[15px] leading-relaxed sm:px-10">

      <h1 className="text-[26px] font-bold text-vsc-bright"><span className="text-vsc-blue"># </span>Политика конфиденциальности</h1>
      <p className="mt-1 text-sm text-vsc-muted">Сайт ypciiiak.online · редакция от {UPDATED}</p>

      <Section title="1. Кто отвечает за данные">
        <p>
          Сайт — личное портфолио Владимира, разработчика из Республики Казахстан. Он же собственник и оператор
          собираемых данных в смысле Закона РК «О персональных данных и их защите» № 94-V. Связаться:{" "}
          <a className="text-vsc-light-blue hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, Telegram{" "}
          <a className="text-vsc-light-blue hover:underline" href="https://t.me/bigboyvova">@bigboyvova</a>.
        </p>
      </Section>

      <Section title="2. Согласие">
        <p>
          Пользуясь сайтом, вы соглашаетесь с этой политикой и со сбором данных, описанных ниже. При первом
          заходе об этом сообщает плашка внизу экрана. Если вы не согласны — пожалуйста, закройте сайт; данные,
          уже собранные о вашем визите, удалим по запросу (раздел 7).
        </p>
      </Section>

      <Section title="3. Что собирается">
        <ul className="list-disc space-y-1 pl-5">
          <li><b className="text-vsc-bright">Технические данные визита:</b> IP-адрес, примерное местоположение по IP (страна, регион, город), интернет-провайдер, браузер и операционная система, тип устройства, размеры экрана и окна, языки браузера, часовой пояс, тип сети, системная тема, источник перехода (referrer, UTM-метки, метка ссылки).</li>
          <li><b className="text-vsc-bright">Действия на сайте:</b> открытые разделы и время на них, клики, прокрутка, движение курсора, переходы по ссылкам, команды в терминале сайта и палитре команд, ошибки страницы.</li>
          <li><b className="text-vsc-bright">Запись сеанса:</b> перечисленные действия сохраняются как последовательность событий (координаты и время), чтобы воспроизвести визит. Это не видео и не снимки экрана.</li>
          <li><b className="text-vsc-bright">Текст, который вы вводите,</b> в запись сеанса не попадает — сохраняется только факт и количество нажатий. Сообщения из формы контакта и гостевой книги приходят владельцу так, как вы их отправили.</li>
          <li><b className="text-vsc-bright">Идентификатор браузера:</b> случайный код в localStorage, чтобы отличать повторные визиты. Отпечатки браузера (fingerprinting) не используются.</li>
        </ul>
      </Section>

      <Section title="4. Зачем">
        <p>
          Чтобы понимать, кто и как смотрит портфолио (например, рекрутер какой компании открыл ссылку из отклика),
          что людям интересно и где сайт неудобен или ломается. Данные не продаются, не используются для рекламы и
          не передаются третьим лицам, кроме сервисов из раздела 5.
        </p>
      </Section>

      <Section title="5. Где хранятся и кто обрабатывает">
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel (хостинг сайта, США/ЕС) — обработка запросов и определение местоположения по IP.</li>
          <li>Supabase (база данных, ЕС/США) — записи сеансов.</li>
          <li>Telegram и электронная почта — уведомления владельцу о визитах.</li>
          <li>ipwho.is — определение интернет-провайдера по IP.</li>
        </ul>
        <p>
          Эти сервисы находятся за пределами Республики Казахстан, поэтому используя сайт, вы соглашаетесь на
          трансграничную передачу данных для целей из раздела 4.
        </p>
      </Section>

      <Section title="6. Сколько хранятся">
        <p>Записи сеансов автоматически удаляются через 90 дней. Уведомления в Telegram и почте владелец удаляет вручную.</p>
      </Section>

      <Section title="7. Ваши права">
        <p>
          Вы можете узнать, какие данные о вас есть, потребовать их исправить или удалить и отозвать согласие.
          Напишите на <a className="text-vsc-light-blue hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> или в
          Telegram, указав примерное время визита и город — ответим в течение 10 рабочих дней. Чтобы сайт перестал
          узнавать ваш браузер, очистите данные сайта (localStorage) в настройках браузера.
        </p>
      </Section>

      <hr className="my-12 border-vsc-line" />

      <h1 id="en" className="scroll-mt-14 text-[26px] font-bold text-vsc-bright"><span className="text-vsc-blue"># </span>Privacy policy</h1>
      <p className="mt-1 text-sm text-vsc-muted">ypciiiak.online · version of {UPDATED}</p>

      <Section title="1. Who is responsible">
        <p>
          This is the personal portfolio of Vladimir, a developer based in the Republic of Kazakhstan, who controls
          the data described here. Contact:{" "}
          <a className="text-vsc-light-blue hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, Telegram{" "}
          <a className="text-vsc-light-blue hover:underline" href="https://t.me/bigboyvova">@bigboyvova</a>.
        </p>
      </Section>

      <Section title="2. Consent">
        <p>
          By using this site you agree to this policy and to the data collection described below. A notice at the
          bottom of the screen says so on your first visit. If you do not agree, please close the site; data already
          collected about your visit will be deleted on request (section 7).
        </p>
      </Section>

      <Section title="3. What is collected">
        <ul className="list-disc space-y-1 pl-5">
          <li><b className="text-vsc-bright">Technical visit data:</b> IP address, approximate location from the IP (country, region, city), internet provider, browser and OS, device type, screen and window size, browser languages, time zone, network type, colour scheme, traffic source (referrer, UTM tags, link tag).</li>
          <li><b className="text-vsc-bright">Activity on the site:</b> sections opened and time spent, clicks, scrolling, pointer movement, links followed, commands in the site terminal and command palette, page errors.</li>
          <li><b className="text-vsc-bright">Session recording:</b> this activity is stored as a sequence of events (coordinates and timing) so the visit can be replayed. It is not video and not screenshots.</li>
          <li><b className="text-vsc-bright">Text you type</b> is not stored in the recording — only that keys were pressed and how many. Messages sent via the contact form or guestbook reach the owner as you sent them.</li>
          <li><b className="text-vsc-bright">Browser identifier:</b> a random code in localStorage to recognise returning visits. No browser fingerprinting.</li>
        </ul>
      </Section>

      <Section title="4. Why">
        <p>
          To understand who views the portfolio and how (for example, which company opened a link from a job
          application), what people find interesting and where the site is inconvenient or breaks. The data is not
          sold, not used for advertising and not shared with anyone except the services in section 5.
        </p>
      </Section>

      <Section title="5. Where it is stored">
        <ul className="list-disc space-y-1 pl-5">
          <li>Vercel (hosting, US/EU) — request handling and IP geolocation.</li>
          <li>Supabase (database, EU/US) — session recordings.</li>
          <li>Telegram and email — visit notifications to the owner.</li>
          <li>ipwho.is — internet provider lookup by IP.</li>
        </ul>
        <p>These services are outside Kazakhstan; by using the site you agree to this cross-border transfer for the purposes in section 4.</p>
      </Section>

      <Section title="6. How long">
        <p>Session recordings are deleted automatically after 90 days. Notifications in Telegram and email are deleted by the owner manually.</p>
      </Section>

      <Section title="7. Your rights">
        <p>
          You can ask what data exists about you, have it corrected or deleted, and withdraw consent. Write to{" "}
          <a className="text-vsc-light-blue hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or via Telegram with the
          approximate time and city of your visit — we reply within 10 working days. To stop the site recognising
          your browser, clear the site data (localStorage) in your browser settings.
        </p>
      </Section>
    </main>
    </div>
  );
}
