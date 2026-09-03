# Dip Finder Pro

let's change the name

BTD(buy the dip) index and quant

the app display BTD score which means it's a good time to buy the dip in terms of fear(fear&greed index, etc), disappointness(news, etc), etc. i think Asset rankings has to have at least 30assets world-wide updating every 5minutes

# MASTER PROMPT

You are a Senior Quantitative Researcher, Portfolio Manager, Data Engineer, Python Engineer, React Engineer, DevOps Engineer, and UI/UX Designer.

Your mission is to build a production-grade quantitative investment platform called:

====================================================

BTD Index™

====================================================

Repository Name

btd-index

The project must be production-ready, Dockerized, modular, scalable, and suitable for public deployment.

The website should resemble Bloomberg, MSCI, Morningstar, TradingView, BlackRock Aladdin, and Koyfin.

====================================================

MISSION

====================================================

The BTD Index™ measures how attractive it is to buy an asset after periods of fear, pessimism, disappointing news, or temporary price weakness.

Instead of emotions, the BTD Index generates a quantitative score between 0 and 100.

Higher scores indicate stronger evidence that an asset may present an attractive long-term buying opportunity.

====================================================

CORE PHILOSOPHY

====================================================

The platform answers one question:

"Is this a statistically attractive time to buy the dip?"

The score should never guarantee future returns.

It should quantify opportunity using multiple independent factors.

====================================================

BTD SCORE

====================================================

Scale

0–100

Categories

95–100

Extreme Opportunity

90–94

Exceptional

80–89

Strong Buy

70–79

Buy

60–69

Watch

50–59

Neutral

40–49

Weak

0–39

Avoid

====================================================

FACTOR ENGINES

====================================================

The BTD Score should be calculated using multiple quantitative engines.

Examples include:

Fear

- Fear & Greed Index

- VIX

- Put/Call Ratio

News & Sentiment

- Negative News Sentiment

- Earnings Disappointments

- Analyst Downgrades

- Social Sentiment

Momentum

- RSI

- Distance from 52-week High

- Relative Strength

- Moving Average Trends

Valuation

- Forward P/E

- EV/EBITDA

- Price/Book

- Free Cash Flow Yield

Quality

- ROE

- ROIC

- Gross Margin

- Debt Ratios

Risk

- Volatility

- Beta

- Maximum Drawdown

Macro

- Interest Rates

- Inflation

- PMI

- Credit Spreads

Normalize every factor to a 0–100 scale before aggregation.

====================================================

LIVE GLOBAL RANKINGS

====================================================

Update automatically every 5 minutes.

Homepage should display:

Top 30 Global Buying Opportunities

The ranking should include a mix of:

US Stocks

Cryptocurrencies

ETFs

Commodities

Market Indices

Each asset displays:

• Rank

• Logo

• Asset Name

• Symbol

• Asset Class

• Country

• Current Price

• Daily Change

• Weekly Change

• Monthly Change

• Market Capitalization (where applicable)

• BTD Score

• Confidence Score

• Rating

• Last Updated

Users can sort by:

BTD Score

Price

Daily Return

Weekly Return

Monthly Return

Market Cap

Asset Class

====================================================

CRYPTO DASHBOARD

====================================================

Display at least the Top 30 cryptocurrencies.

Update every 5 minutes.

====================================================

US STOCK DASHBOARD

====================================================

Display every S&P 500 company.

Display every NASDAQ-100 company.

Support future expansion to all listed US equities.

====================================================

ASSET PROFILE PAGE

====================================================

Every asset should have its own page.

Example

/stocks/AAPL

/crypto/BTC

Display:

Historical Price Chart

Historical BTD Score

Factor Breakdown

News Sentiment

Valuation Metrics

Risk Metrics

Performance

BTD Score History

====================================================

INVESTMENT SIMULATOR

====================================================

Allow users to simulate:

"If I invested $10,000 whenever an asset reached a BTD Score above 85..."

Display:

Portfolio Value

Total Return

Annualized Return

Maximum Drawdown

Sharpe Ratio

====================================================

DATA PIPELINE

====================================================

Automatically refresh every 5 minutes.

Pipeline:

Download market data

Update news sentiment

Recalculate factors

Generate BTD Scores

Update rankings

Store in PostgreSQL

Refresh API

Refresh frontend automatically

====================================================

API

====================================================

FastAPI

Endpoints

/api/assets

/api/rankings

/api/btd

/api/history

/api/chart

/api/news

/api/simulator

====================================================

DOCKER

====================================================

Create

Dockerfile

docker-compose.yml

NGINX

Frontend

Backend

Database

Everything launches with

docker compose up -d

====================================================

UI

====================================================

Professional institutional appearance.

Dark mode by default.

Responsive.

Fast.

Minimal.

Animated.

====================================================

README

====================================================

Generate complete documentation.

Architecture

Installation

Docker

Deployment

Methodology

API

Future Roadmap

====================================================

FINAL GOAL

====================================================

The completed platform should feel like a professional institutional quantitative research terminal.

Visitors should immediately see:

• Top 30 global buy-the-dip opportunities

• Live BTD Scores

• Market fear indicators

• Historical performance

• Interactive charts

• Investment simulator

• Quantitative factor breakdown

• Live updates every 5 minutes

The application should be capable of scaling into a global quantitative investment platform.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://dip-finder-score.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fae75e8a-8eb8-47d6-9a01-019a41c49f9d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
