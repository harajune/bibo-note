const TOML = require('smol-toml');

exports.handler = async (event) => {
    const response = event.Records[0].cf.response;
    const request = event.Records[0].cf.request;

    // Only process .toml files
    if (!request.uri.endsWith('.toml')) {
        return response;
    }

    try {
        // Parse TOML content from response
        const tomlContent = Buffer.from(response.body.data, 'base64').toString();
        const parsedData = TOML.parse(tomlContent);

        // Set appropriate headers
        response.headers['content-type'] = [{
            key: 'Content-Type',
            value: 'application/toml'
        }];
        
        response.headers['cache-control'] = [{
            key: 'Cache-Control',
            value: 'max-age=3600'
        }];

        return response;
    } catch (error) {
        // Return 500 error if TOML parsing fails
        return {
            status: '500',
            statusDescription: 'Internal Server Error',
            headers: {
                'content-type': [{
                    key: 'Content-Type',
                    value: 'text/plain'
                }]
            },
            body: 'Error processing TOML file'
        };
    }
};
