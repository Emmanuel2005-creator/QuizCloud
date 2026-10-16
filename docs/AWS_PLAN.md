# Future AWS deployment plan

**Status: design only.** No AWS resources have been provisioned and no deployment workflow is enabled. Deployment, cost acceptance, and account configuration require separate approval.

## Target architecture

```text
Browser -> HTTPS CloudFront -> signed origin requests -> private S3 bucket
                 |
          Optional custom domain: Route 53 + ACM

Future delivery: GitHub Actions -> OIDC -> scoped IAM role -> S3 / CloudFront
```

1. Upload only the **contents of `dist/`** to a private S3 bucket. Retain S3 Block Public Access and use the S3 REST endpoint as the origin. Do not use an S3 website endpoint for this design.
2. Use CloudFront Origin Access Control (OAC), signed origin requests, a bucket policy limited to that distribution, and `index.html` as the default root object.
3. Redirect browser HTTP requests to HTTPS. OAC's always-sign setting supports HTTPS between CloudFront and S3. Keep direct anonymous bucket access blocked.
4. Optionally use Route 53 DNS and an ACM certificate in `us-east-1` for a custom domain with CloudFront. Agree on domain ownership and costs before provisioning.

This design follows [AWS's OAC guidance](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html) and [HTTPS origin guidance](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-s3-origin.html).

## Future delivery and credentials

- Run syntax and unit checks before deployment; add browser CI after selecting and testing a runner/browser setup.
- Use a GitHub deployment environment with approval protection where supported by the selected repository settings.
- Use GitHub Actions OIDC for short-lived AWS credentials. Restrict IAM trust to the intended repository and approved branch or environment.
- Grant only the S3 object/list permissions and specific CloudFront invalidation access needed for this site. Define exact resource identifiers after approval.
- Do not store AWS access keys in source, Git history, frontend files, or GitHub secrets for this OIDC design. Frontend assets are visible to visitors.
- Review and pin action revisions when implementing the workflow. This version contains no deployment workflow.

See [GitHub's AWS OIDC documentation](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

## Caching and rollback

The current filenames are not content hashed. Start with explicit short cache lifetimes for HTML, JavaScript, and CSS; configure CloudFront minimum TTL to respect those headers. Upload a verified consistent set of files, publish HTML last, and invalidate affected paths after updates. Do not apply year-long immutable caching to unversioned application files.

Keep release artifacts tied to source commits. Consider S3 versioning with agreed retention/lifecycle rules and storage costs. Rollback should restore a complete known-good set of files and invalidate the cache.

## Deployment acceptance checks

- Verify the HTTPS URL and HTTP redirect, correct content types, and successful delivery of all assets.
- Confirm direct anonymous S3 access is denied while CloudFront can fetch the app.
- Play a complete round and verify timing, scoring, review, replay, and phone layout on the hosted origin.
- Confirm bests persist on that origin. Localhost scores will not transfer automatically.
- Check cache behavior and rehearse rollback to a known-good release.
- Review CloudFront/S3 metrics, configure budget alerts, and document actual costs and resources.

## Scope and teardown

This static version needs no EC2 instance, application server, database, or Lambda function. Accounts, synchronized scores, and trusted leaderboards would require a separately designed backend.

Before provisioning, agree on region, resource names, domain, spend limits, and retention. Teardown must account for CloudFront disable/delete timing, DNS, bucket versions, optional logs, and any infrastructure state. This document authorizes no spending or deployment.
