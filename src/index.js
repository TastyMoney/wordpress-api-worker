import * as Realm from 'realm-web';
import * as utils from './utils';
let App;
const ObjectId = Realm.BSON.ObjectID;

const worker = {
    async fetch(req, env) {
        const url = new URL(req.url);
        App = App || new Realm.App(env.ATLAS_APPID);
        const query = url.searchParams;
        const method = req.method;
        const token = env.MONGO_API_KEY;
        

        const path = url.pathname.split('/').filter(p => p.length > 0);
        if (path.length === 0){
            return new Response('Endpoint not found' + path, { status: 404 });
        }


        if (!token)
            return utils.toError(`Missing 'authorization' header; try to add the header 'authorization: ATLAS_APP_API_KEY'.`, 401);
        try {
            const credentials = Realm.Credentials.apiKey(token);
            var user = await App.logIn(credentials);
            var client = user.mongoClient('mongodb-atlas');
        }
        catch (err) {
            return utils.toError('Error with authentication.', 500);
        }
        const collection = client.db('website_content').collection('posts');

        const route = path[0];
        switch(route) {
            case 'getpostbypostid':
                return getPostById(path[1], collection, query);
            case 'getpostsbycatid':
                return getPostsByCatId(path[1], collection, query);
            case 'getpostsbytagid':
                return getPostsByTagId(path[1], collection, query);
            case 'getallposts':
                return getAllPosts(collection, query);
    
            default:
                return new Response('Endpoint not found', { status: 404 });
        }
    }
};

async function getPostsByCatId(catId, collection, query) {
    const { page, pageSize } = utils.parsePaginationParams(query);
    const skip = (page - 1) * pageSize;
    // const matchStage = {
    //     $match: {
    //         "categories.id": { "$numberInt": catId.toString() }
    //     }
    // };
    // const skipStage = { $skip: skip };
    // const limitStage = { $limit: pageSize };


    const aggregationPipeline = [
        { $match: { "categories.id": { "$numberInt": catId.toString() } } },

        { $sort: { "published_at": -1 } }, // 按
        {
            $facet: {
                totalData: [
                    { $count: "total" }
                ],
                data: [
                    { $skip: skip },
                    { $limit: pageSize }
                ]
            }
        }
    ];

    // const aggregationPipeline = [
    //     matchStage,
    //     skipStage,
    //     limitStage
    // ];

    const results = await collection.aggregate(aggregationPipeline);

    if (results.length > 0) {
        const totalRecords = results[0].totalData.length > 0 ? results[0].totalData[0].total : 0;
        const totalPages = Math.ceil(totalRecords / pageSize);
        const data = results[0].data;

        return utils.toJSON({
            totalRecords,
            totalPages,
            data
        });
    }
    return utils.toJSON({totalRecords: 0, totalPages: 0, data: [] });

    return utils.toJSON(data);
}


async function getPostsByTagId(tagId, collection, query) {

    const { page, pageSize } = utils.parsePaginationParams(query);

    const skip = (page - 1) * pageSize;
    const matchStage = {
        $match: {
            "tags.id": { "$numberInt": tagId.toString() }
        },
        
        
    };
    const sortStage = { $sort: { "published_at": -1 } };
    const skipStage = { $skip: skip };
    const limitStage = { $limit: pageSize };

    const aggregationPipeline = [
        matchStage,
        sortStage,
        skipStage,
        limitStage
    ];

    const data = await collection.aggregate(aggregationPipeline);
    return utils.toJSON(data);
}


async function getPostById(postId, collection, query) {
    return utils.reply(await collection.findOne({wp_post_id:{"$numberInt": postId.toString()}}));
}

async function getAllPosts(collection,query){
    return utils.handlePaginatedRequest(collection, {}, query);

}


export default worker;
