const fs = require('fs');

function saveWorld(context) {
    fs.writeFile("userworlds/" + context.user + "-world.json", JSON.stringify(context.world), err => {
        if (err) {
            console.error(err)
            throw new Error(`Erreur d'écriture du monde coté serveur`)
        }
    })
}

//mutations
async function acheterQtProduit(parent, args, context) {
    update(context)

    //Rec
    let id = args.id
    let quantite = args.quantite

    let products = context.world.products
    let index = products.findIndex(x => x.id === id)
    if (index === null || false) {
        throw new Error(`Le produit avec l'id ${args.id} n'existe pas`)
    }

    //Actions
    // modify quantite
    context.world.products[index].quantite = products[index].quantite + quantite
    // money
    context.world.money = context.world.money - products[index].cout
    // cout
    context.world.products[index].cout = Math.floor(sumOfGeometricSeries(context.world.products[index].cout, products[index].croissance, 2))

    //Sauvegarde
    saveWorld(context)
    return products[index]
}

function lancerProductionProduit(parent, args, context) {
    update(context)

    let id = args.id
    let quantite = args.quantite

    let products = context.world.products
    let index = products.findIndex(x => x.id === id)
    if (index === null || false) {
        throw new Error(`Le produit avec l'id ${args.id} n'existe pas`)
    }

    context.world.products[index].timeleft = context.world.products[index].vitesse

    saveWorld(context)
    return products[index]
}

function engagerManager(parent, args, context) {
    update(context)

    //Réc
    let id = args.id

    let managers = context.world.managers
    let indexManager = managers.findIndex(x => x.id === id)
    if (indexManager === null || false) {
        throw new Error(`Le manager avec l'id ${args.id} n'existe pas`)
    }
    let products = context.world.products
    let indexProduct = products.findIndex(x => x.id === managers[indexManager].idcible)

    //Actions
    // modify managerUnlock
    context.world.products[indexProduct].managerUnlocked = true

    // modify unlocked
    context.world.managers[indexManager].unlocked = true

    //Sauvegarde
    saveWorld(context)
    return { manager: managers[indexManager], product: products[indexProduct] }
}

module.exports = {
    Query: {
        getWorld(parent, args, context) {
            update(context)
            saveWorld(context)
            return context.world
        }
    },
    Mutation: { acheterQtProduit, lancerProductionProduit, engagerManager }
};

//Privates
function sumOfGeometricSeries(firstTerm, commonRatio, noOfTerms) {
    var result = 0;
    for (let i = 0; i < noOfTerms; i++) {
        result = result + firstTerm;
        firstTerm = firstTerm * commonRatio;
    }
    return result;
}

function update(context){
    let world = context.world
    let products = context.world.products
    let money = 0
    let elapsedTime = Date.now() - parseInt(context.world.lastupdate) //Calculate elapsed time since last update

    products.forEach(product => {
        //If manager is unlocked
        if (product.managerUnlocked) {
            //Calculate number of products produced
            let nbOfProducts = Math.trunc(elapsedTime / product.vitesse)
            //If products have been produced
            if (nbOfProducts > 0) {
                //Update product production time according to elapsed time
                product.timeleft = product.vitesse - (elapsedTime % product.vitesse)
                //Elapsed time / speed products have been created
                money = nbOfProducts * product.quantite * product.revenu * (1 + world.angelbonus * world.activeangels / 100)
            } else product.timeleft -= elapsedTime
        }
        //If production time is not null, product is being produced
        else if (product.timeleft !== 0) {
            product.timeleft -= elapsedTime
            if (product.timeleft < 0 && product.timeleft <= elapsedTime) {
                //If manager is not yet unlocked, only 1 product has been created
                product.timeleft = 0
                money = product.revenu * product.quantite * (1 + world.angelbonus * world.activeangels / 100)
            }
        }
    })

    //Update world's money, score & lastupdate
    world.money += money
    world.score += money
    world.lastupdate = parseInt(Date.now())

    return context
}
