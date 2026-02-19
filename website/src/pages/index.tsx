import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          minHeight: '60vh',
        }}>
        <Heading as="h1">{siteConfig.title}</Heading>
        <p style={{fontSize: '1.25rem', textAlign: 'center', maxWidth: 600}}>
          {siteConfig.tagline}
        </p>
        <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
          <Link className="button button--primary button--lg" to="/docs/">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/adr/">
            Architecture Decisions
          </Link>
        </div>
      </main>
    </Layout>
  );
}
