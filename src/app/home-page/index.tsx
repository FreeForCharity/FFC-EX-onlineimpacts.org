import React from 'react'
import { assetPath } from '@/lib/assetPath'

// Online Impacts closed and merged its services into Free For Charity. The
// live site (onlineimpacts.org) served only a single merge notice, so this
// page is that notice, stated plainly ("now part of Free For Charity"), and
// sends visitors to FFC's real pathways: freeforcharity.org, the Online
// Impacts onboarding guide and the FFC hub. It deliberately does not
// fabricate a full charity microsite behind it. See
// FFC-Cloudflare-Automation#702 tracking issue #14 for the capture notes.
const HomePage = () => {
  return (
    <div
      className="relative min-h-[calc(100vh-1px)] flex items-center bg-cover bg-center bg-white"
      style={{ backgroundImage: `url(${assetPath('/Images/online-impacts-merge-bg.jpg')})` }}
    >
      <div className="ffc-container py-[70px]">
        <div className="max-w-[560px] rounded-[10px] bg-black/40 px-8 py-10 text-white sm:px-12">
          <img
            src={assetPath('/Images/online-impacts-logo.png')}
            alt="Online Impacts"
            className="mb-8 h-auto w-full max-w-[420px]"
          />
          <h1 className="mb-6 text-[28px] leading-[36px] font-bold lato-font">
            Online Impacts is now part of Free For Charity
          </h1>
          <p className="mb-6 text-[18px] leading-[28px] lato-font">
            <strong>
              Online Impacts built websites and offered free tech help to nonprofits, and has merged
              its services into{' '}
              <a href="https://freeforcharity.org" className="underline hover:text-gray-200">
                Free For Charity
              </a>
              . Nonprofits looking for free web hosting and development should go to{' '}
              <a href="https://freeforcharity.org" className="underline hover:text-gray-200">
                freeforcharity.org
              </a>
              .
            </strong>
          </p>
          <p className="mb-6 text-[18px] leading-[28px] lato-font">
            <strong>
              If your website was hosted or developed by Online Impacts, follow the{' '}
              <a
                href="https://freeforcharity.org/online-impacts-onboarding-guide/"
                className="underline hover:text-gray-200"
              >
                Online Impacts onboarding guide
              </a>{' '}
              to migrate to Free For Charity. Charities already supported by Free For Charity can
              sign in at the{' '}
              <a href="https://freeforcharity.org/hub/" className="underline hover:text-gray-200">
                Free For Charity hub
              </a>
              .
            </strong>
          </p>
          <p className="text-[18px] leading-[28px] lato-font">
            <strong>
              It was an honor developing hundreds of sites free of cost for nonprofits!
            </strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomePage
