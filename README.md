# MetaMask Login for WordPress

A WordPress plugin that allows users to log in using a Web3 wallet (like MetaMask) instead of traditional username/password authentication.

## Features

- **Web3 Wallet Login**: Connect to MetaMask or other compatible Web3 wallets
- **Role-Based Access Control**: Manually assign administrator roles to specific wallet addresses
- **Automatic User Registration**: New wallet addresses are automatically registered as users
- **RTL Support**: Full support for right-to-left languages
- **Persian (Farsi) Language**: Complete Persian translation included
- **Secure Authentication**: Uses cryptographic signature verification for secure logins

## Installation

1. Upload the `metamask-login` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to 'MetaMask Login' in the WordPress admin menu to configure settings

## Configuration

After activating the plugin, you need to:

1. Navigate to the "MetaMask Login" settings page in your WordPress admin area
2. Enter the Ethereum wallet addresses that should have administrator access (one per line)
3. Select the default role for new users who log in with MetaMask

## Usage

Once configured, the plugin will add a "Login with MetaMask" button to your WordPress login page. Users can click this button to:

1. Connect their MetaMask wallet to your website
2. Sign a unique message to verify their ownership of the wallet
3. Log in to WordPress using their wallet identity

New users will be automatically registered with their wallet address.

## Security

This plugin implements several security measures:

- Nonce verification for all AJAX requests
- Wallet address format validation
- Conversion of wallet addresses to lowercase for consistency
- Session-based nonce storage for signature challenges
- WordPress sanitization for all inputs

## Requirements

- WordPress 5.0 or higher
- PHP 7.2 or higher
- Web3-compatible browser (with MetaMask or similar extension installed)

## Translation

The plugin comes with full translation support:

- English (default)
- Persian (Farsi)

You can add more translations by adding .po/.mo files to the `languages` directory.

## License

This plugin is licensed under the GPL v2 or later.

## Support

For support and feature requests, please open an issue on the plugin's GitHub repository.

## Credits

- Uses [ethers.js](https://docs.ethers.io/) for Web3 wallet interaction
- Icons and UI elements from the WordPress core UI

## Changelog

### 1.0.0
- Initial release 