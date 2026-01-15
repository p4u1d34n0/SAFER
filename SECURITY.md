# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in SAFER CLI, please report it responsibly:

### Where to Report

**Email**: paul.dean@oxfordop.co.uk

**Subject**: [SECURITY] SAFER CLI Vulnerability Report

### What to Include

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** and severity
4. **Suggested fix** (if you have one)
5. **Your contact information** for follow-up

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-3 days
  - High: 1-2 weeks
  - Medium: 2-4 weeks
  - Low: Next release cycle

### Security Considerations

SAFER CLI handles sensitive data and credentials:

#### GitHub Tokens

- Stored in `~/.safer/config.json`
- **Recommendation**: Use GitHub CLI (`gh`) authentication instead of tokens
- Never commit config files with tokens
- Use environment variables for CI/CD

#### Data Storage

- All SAFER data stored in `~/.safer/`
- Git repository with local history
- **Recommendation**:
  - Set appropriate file permissions (`chmod 700 ~/.safer`)
  - Use encrypted filesystems for sensitive data
  - Regularly backup and review access logs

#### Git Hooks

- Installed locally in `.git/hooks/`
- Never committed to shared repositories
- **Recommendation**:
  - Review hooks before installation
  - Use `--no-verify` if hooks cause issues

### Known Limitations

1. **Token Storage**: Config files store tokens in plain text
   - Mitigation: Use GitHub CLI for keychain storage

2. **File Permissions**: Config files created with default umask
   - Mitigation: Manually set restrictive permissions

3. **Command Injection**: User input passed to git commands
   - Mitigation: Input validation and sanitization

### Best Practices

1. **Use GitHub CLI** for authentication (uses system keychain)
2. **Restrict file permissions** on `~/.safer/` directory
3. **Don't share** your `.safer/` directory or config files
4. **Review** imported data from external platforms
5. **Keep dependencies updated** with `npm audit`

### Security Updates

Security updates will be released as patch versions and announced via:
- GitHub Security Advisories
- CHANGELOG.md
- Email to known users (if critical)

### Responsible Disclosure

We kindly ask security researchers to:
- Give us reasonable time to fix vulnerabilities before public disclosure
- Not access or modify user data without permission
- Not perform testing that could damage systems or data

Thank you for helping keep SAFER CLI secure!
