weights = [1,2,3,1,1]
days = 4

def check(botWeight):
    totalDay = 0
    newWeight = botWeight

    for i in range(len(weights)):
        newWeight -= weights[i]

        if newWeight == 0:
            totalDay += 1
            newWeight = botWeight
        elif i + 1 < len(weights) and newWeight - weights[i + 1] < 0:
            totalDay += 1
            newWeight = botWeight
        elif i == len(weights) - 1:
            totalDay += 1

        
    print("botWeight: ", botWeight , "totalDays: ", totalDay)
    return totalDay <= days

l = 0
r = sum(weights)


while l <= r:
    mid = (l+r) // 2
    print("l: ", l, "mid: ", mid, "r: ", r)
    if check(mid):
        r = mid - 1
    else:
        l = mid + 1

# return l

print("l" , l)