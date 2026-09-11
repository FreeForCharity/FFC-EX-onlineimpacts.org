import React from 'react'
import { assetPath } from '@/lib/assetPath'

// Online Impacts closed and merged its services into Free For Charity. The
// live site (onlineimpacts.org) now serves only this single notice — no
// other page renders (WordPress "Coming Soon" maintenance mode gates every
// other route) — so this static clone reproduces exactly that one page
// rather than fabricating a full charity microsite behind it. See
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
          <p className="mb-6 text-[18px] leading-[28px] lato-font">
            <strong>
              Good news! We have decided to merge our services with{' '}
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
          <p className="text-[18px] leading-[28px] lato-font">
            <strong>
              If your website was hosted or developed by Online Impacts please go{' '}
              <a
                href="https://freeforcharity.org/online-impacts-onboarding-guide/"
                className="underline hover:text-gray-200"
              >
                here
              </a>{' '}
              to migrate to Free For Charity. It was an honor developing hundreds of sites free of
              cost for nonprofits!
            </strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default HomePage
