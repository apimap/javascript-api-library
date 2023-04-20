/**
 * This code is very much a copy of the https://auth0.com/blog/complete-guide-to-vue-user-authentication/
 * oauth0 plugin. Since apimap only needs a small part of the functionality and a very specific
 * set of parameters we have created a small version of their old code.
 */

import Vue from 'vue';
import axios from "axios";
import jwt_decode from "jwt-decode";
import { v4 as uuid } from 'uuid';

const LOCAL_STORAGE_STATE_KEY = "oauth2state"

let instance;
export const getInstance = () => instance;

export const handleOAuth = ({
    onSuccess =(state) => {
        console.log(state)
    },
    onFailure = (message) => {
        alert(message)
    },
    ...options
}) => {
    instance = new Vue({
        data() {
            return {
                token: undefined,
                user: undefined
            };
        },
        computed: {
            /**
             * Return if a token has been received and saved
             * @returns {boolean}
             */
            hasToken() {
                return this.token !== undefined
            },
            /**
             * Return if a id token has been received and a user id saved
             * @returns {boolean}
             */
            hasUser() {
                return this.user !== undefined
            }
        },
        methods: {
            /**
             * Create a random identifier to be used to validate the return value from the code request
             * @returns {string}
             */
            createRandomState(){
                return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
            },
            /**
             * Redirect the browser to initiate a code request
             * @param {string} state
             */
            fetchCode(state){
                localStorage.setItem(LOCAL_STORAGE_STATE_KEY, state)
                window.location.replace(`${options.sso}/oauth2/authorize?state=${state}&callback=${window.location}`);
            },
            /**
             * After code request returend use this to fetch the jwt token and id token
             * @param {string} code
             * @param {string} state
             * @param {string} provider
             * @returns {Promise<void>}
             */
            async fetchToken(code, state, provider){
                if(state !== localStorage.getItem(LOCAL_STORAGE_STATE_KEY)){
                    onFailure("Unable to determine if the request has been returned from the correct server. Please reload the page and try again. If the problem continues contact your system administrator.")
                    return;
                }

                localStorage.removeItem(LOCAL_STORAGE_STATE_KEY)

                const client = await axios.create({
                    baseURL: options.sso,
                    headers: {
                        "Content-Type": "application/json",
                    },
                })

                const tokenResponse = await client.get(`/oauth2/access_token?code=${code}&provider=${provider}`, {
                    headers:{
                        "X-Request-Id": uuid()
                    }
                })
                    .then(response => response.data)
                    .catch(error => {
                        onFailure(error);
                    });

                // Access Token
                this.token = tokenResponse['access_token'];

                if(this.token === undefined){
                    onFailure("Missing access token. Please reload the page and try again. If the problem continues contact your system administrator.")
                    return;
                }

                // ID Token
                let idToken = jwt_decode(tokenResponse['id_token']);
                this.user = idToken['sub']

                if(this.user === undefined){
                    onFailure("Missing id token. Please reload the page and try again. If the problem continues contact your system administrator.")
                    return;
                }

                // Clean up browser url
                window.history.replaceState({}, document.title, window.location.pathname);

                onSuccess(this.token);
            }
        },
        /**
         * Determine the type of request that initiated the page reload
         * @returns {Promise<void>}
         */
        async created() {
           try {
               let params = new URLSearchParams(window.location.search);

               if ( params.get('code') &&
                   params.get('state') &&
                   params.get('provider')) {
                    await this.fetchToken(
                        params.get('code'),
                        params.get('state'),
                        params.get('provider')
                    );
                } else if (this.token === undefined){
                    this.fetchCode(this.createRandomState());
                }
            } catch (error) {
               onFailure("Apimap was unable to determine if you where redirected by a initial request or a fetch token request. Please reload the page and try again. If the problem continues contact your system administrator.")
            }
        },
    });

    return instance;
}

/**
 * Export this module into $auth in vue
 * @type {{install(*, *): void}}
 */
export const oauth = {
    install(Vue, options) {
        Vue.prototype.$auth = handleOAuth(options);
    },
};